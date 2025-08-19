
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises; // For file system operations
const bcrypt = require('bcrypt'); // For password hashing
const session = require('express-session'); // For session management

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Session Middleware
app.use(session({
    secret: 'your_secret_key', // Replace with a strong secret in production
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Rate Limiter: 20 requests per minute per IP
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { error: 'Too many requests, please try again later or create an account.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Tax Calculation Logic (Moved from script.js) ---

const taxBrackets = {
    '2026': [
        { min: 0, max: 237100, rate: 0.18, base: 0 },
        { min: 237101, max: 370500, rate: 0.26, base: 42678 },
        { min: 370501, max: 512800, rate: 0.31, base: 77362 },
        { min: 512801, max: 673000, rate: 0.36, base: 121475 },
        { min: 673001, max: 857900, rate: 0.39, base: 179147 },
        { min: 857901, max: 1817000, rate: 0.41, base: 251258 },
        { min: 1817001, max: Infinity, rate: 0.45, base: 644489 }
    ],
    '2025': [
        { min: 0, max: 237100, rate: 0.18, base: 0 },
        { min: 237101, max: 370500, rate: 0.26, base: 42678 },
        { min: 370501, max: 512800, rate: 0.31, base: 77362 },
        { min: 512801, max: 673000, rate: 0.36, base: 121475 },
        { min: 673001, max: 857900, rate: 0.39, base: 179147 },
        { min: 857901, max: 1817000, rate: 0.41, base: 251258 },
        { min: 1817001, max: Infinity, rate: 0.45, base: 644489 }
    ],
    '2024': [
        { min: 0, max: 237100, rate: 0.18, base: 0 },
        { min: 237101, max: 370500, rate: 0.26, base: 42678 },
        { min: 370501, max: 512800, rate: 0.31, base: 77362 },
        { min: 512801, max: 673000, rate: 0.36, base: 121475 },
        { min: 673001, max: 857900, rate: 0.39, base: 179147 },
        { min: 857901, max: 1817000, rate: 0.41, base: 251258 },
        { min: 1817001, max: Infinity, rate: 0.45, base: 644489 }
    ]
};

const taxRebates = {
    '2026': { 'under65': 17235, '65to75': 17235 + 9444, 'over75': 17235 + 9444 + 3145 },
    '2025': { 'under65': 17235, '65to75': 17235 + 9444, 'over75': 17235 + 9444 + 3145 },
    '2024': { 'under65': 17235, '65to75': 17235 + 9444, 'over75': 17235 + 9444 + 3145 }
};

const uifCeiling = { '2026': 17712, '2025': 17712, '2024': 17712 };
const uifRate = 0.01;
const travelAllowanceTaxableRate = 0.8;

function calculatePaye(annualTaxableIncome, taxYear, age) {
    const brackets = taxBrackets[taxYear];
    let tax = 0;
    for (const bracket of brackets) {
        if (annualTaxableIncome >= bracket.min && annualTaxableIncome <= bracket.max) {
            tax = bracket.base + bracket.rate * (annualTaxableIncome - bracket.min + 1);
            break;
        }
    }
    const rebate = taxRebates[taxYear][age];
    tax = Math.max(0, tax - rebate);
    return tax;
}

function calculateUif(periodGross, taxYear) {
    const ceiling = uifCeiling[taxYear];
    const uifBase = Math.min(periodGross, ceiling);
    return uifBase * uifRate;
}

function convertToAnnual(amount, period) {
    switch (period) {
        case 'weekly': return amount * 52;
        case 'biweekly': return amount * 26;
        case 'monthly': return amount * 12;
        case 'yearly': return amount;
        default: return amount * 12;
    }
}

function convertFromAnnual(amount, period) {
    switch (period) {
        case 'weekly': return amount / 52;
        case 'biweekly': return amount / 26;
        case 'monthly': return amount / 12;
        case 'yearly': return amount;
        default: return amount / 12;
    }
}

function calculateForward(basicSalary, travelAllowance, taxYear, salaryPeriod, age) {
    const periodGross = basicSalary + travelAllowance;
    const annualBasic = convertToAnnual(basicSalary, salaryPeriod);
    const annualTravel = convertToAnnual(travelAllowance, salaryPeriod);
    const taxableTravel = annualTravel * travelAllowanceTaxableRate;
    const annualTaxableIncome = annualBasic + taxableTravel;
    const annualPaye = calculatePaye(annualTaxableIncome, taxYear, age);
    const periodUif = calculateUif(periodGross, taxYear);
    const periodPaye = convertFromAnnual(annualPaye, salaryPeriod);
    const periodNet = periodGross - periodPaye - periodUif;
    return { basic: basicSalary, travel: travelAllowance, gross: periodGross, paye: periodPaye, uif: periodUif, net: periodNet, annualTaxableIncome };
}

function binarySearchGrossSalary(netSalary, travelAllowance, taxYear, salaryPeriod, age) {
    let lowerBound = Math.max(0, netSalary - travelAllowance);
    let upperBound = (netSalary - travelAllowance) * 2.5;
    const maxIterations = 50;
    const tolerance = 0.1;

    for (let i = 0; i < maxIterations; i++) {
        const midPoint = (lowerBound + upperBound) / 2;
        const periodBasic = midPoint;
        const result = calculateForward(periodBasic, travelAllowance, taxYear, salaryPeriod, age);
        const calculatedNet = result.net;

        if (Math.abs(calculatedNet - netSalary) < tolerance) {
            return { success: true, ...result };
        }

        if (calculatedNet < netSalary) {
            lowerBound = midPoint;
        } else {
            upperBound = midPoint;
        }
        if (upperBound - lowerBound < tolerance) {
             return { success: true, ...result };
        }
    }
    return { success: false };
}


// --- API Endpoint ---

app.post('/api/calculate', apiLimiter, (req, res) => {
    const {
        calculationType,
        taxYear,
        salaryPeriod,
        age,
        basicSalary,
        travelAllowance,
        netSalary
    } = req.body;

    if (calculationType === 'forward') {
        if (isNaN(basicSalary) || basicSalary <= 0) {
            return res.status(400).json({ error: 'Invalid basic salary' });
        }
        const result = calculateForward(basicSalary, travelAllowance || 0, taxYear, salaryPeriod, age);
        res.json(result);

    } else if (calculationType === 'backward') {
        if (isNaN(netSalary) || netSalary <= 0) {
            return res.status(400).json({ error: 'Invalid net salary' });
        }
        const result = binarySearchGrossSalary(netSalary, travelAllowance || 0, taxYear, salaryPeriod, age);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ error: 'Could not calculate gross salary accurately.' });
        }
    } else {
        res.status(400).json({ error: 'Invalid calculation type' });
    }
});

app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const usersFilePath = path.join(__dirname, 'users.json');
        let users = [];

        // Read existing users
        try {
            const data = await fs.readFile(usersFilePath, 'utf8');
            users = JSON.parse(data);
        } catch (readError) {
            // If file doesn't exist or is empty, start with an empty array
            if (readError.code === 'ENOENT' || readError instanceof SyntaxError) {
                users = [];
            } else {
                console.error('Error reading users.json:', readError);
                return res.status(500).json({ error: 'Internal server error.' });
            }
        }

        // Check for duplicate username
        if (users.some(user => user.username === username)) {
            return res.status(409).json({ error: 'Username already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

        // Add new user
        users.push({ username, password: hashedPassword });

        // Write updated users back to file
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8');

        res.status(201).json({ message: 'Account created successfully!' });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error during signup.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const usersFilePath = path.join(__dirname, 'users.json');
        let users = [];

        // Read existing users
        try {
            const data = await fs.readFile(usersFilePath, 'utf8');
            users = JSON.parse(data);
        } catch (readError) {
            // If file doesn't exist or is empty, no users to check against
            if (readError.code === 'ENOENT' || readError instanceof SyntaxError) {
                users = [];
            } else {
                console.error('Error reading users.json:', readError);
                return res.status(500).json({ error: 'Internal server error.' });
            }
        }

        // Find user
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Set session
        req.session.userId = user.username;
        res.status(200).json({ message: 'Login successful!' });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});


// --- Server ---

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
