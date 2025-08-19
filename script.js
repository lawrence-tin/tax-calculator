// ZA Tax Calculator - JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Tax brackets for 2025/2026 (same as 2024/2025 as per SARS)
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

    // Tax rebates by age and year
    const taxRebates = {
        '2026': {
            'under65': 17235,
            '65to75': 17235 + 9444,
            'over75': 17235 + 9444 + 3145
        },
        '2025': {
            'under65': 17235,
            '65to75': 17235 + 9444,
            'over75': 17235 + 9444 + 3145
        },
        '2024': {
            'under65': 17235,
            '65to75': 17235 + 9444,
            'over75': 17235 + 9444 + 3145
        }
    };

    // UIF ceiling by year
    const uifCeiling = {
        '2026': 17712,
        '2025': 17712,
        '2024': 17712
    };

    // UIF rate (1%)
    const uifRate = 0.01;
    
    // Travel allowance taxable portion (80%)
    const travelAllowanceTaxableRate = 0.8;

    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Accordion functionality for FAQ
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');
        
        header.addEventListener('click', () => {
            // Close all other accordion items
            accordionItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.accordion-content').style.maxHeight = null;
                    otherItem.querySelector('.accordion-icon').textContent = '+';
                }
            });
            
            // Toggle current accordion item
            item.classList.toggle('active');
            
            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + 'px';
                item.querySelector('.accordion-icon').textContent = '×';
            } else {
                content.style.maxHeight = null;
                item.querySelector('.accordion-icon').textContent = '+';
            }
        });
    });

    // Forward calculation form submission
    const forwardForm = document.getElementById('forward-form');
    forwardForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const taxYear = document.getElementById('tax-year').value;
        const salaryPeriod = document.getElementById('salary-period').value;
        const basicSalary = parseFloat(document.getElementById('gross-salary').value);
        const travelAllowance = parseFloat(document.getElementById('travel-allowance').value) || 0;
        const age = document.getElementById('age').value;
        
        if (isNaN(basicSalary) || basicSalary <= 0) {
            alert('Please enter a valid basic salary amount.');
            return;
        }
        
        // Calculate tax and display results
        calculateForward(basicSalary, travelAllowance, taxYear, salaryPeriod, age);
    });

    // Backward calculation form submission
    const backwardForm = document.getElementById('backward-form');
    backwardForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const taxYear = document.getElementById('backward-tax-year').value;
        const salaryPeriod = document.getElementById('backward-salary-period').value;
        const netSalary = parseFloat(document.getElementById('net-salary').value);
        const travelAllowance = parseFloat(document.getElementById('backward-travel-allowance').value) || 0;
        const age = document.getElementById('backward-age').value;
        
        if (isNaN(netSalary) || netSalary <= 0) {
            alert('Please enter a valid take-home pay amount.');
            return;
        }
        
        // Calculate gross and display results
        calculateBackward(netSalary, travelAllowance, taxYear, salaryPeriod, age);
    });

    // Forward calculation function (gross to net)
    function calculateForward(basicSalary, travelAllowance, taxYear, salaryPeriod, age) {
        // Calculate gross salary (basic + travel)
        const periodGross = basicSalary + travelAllowance;
        
        // Convert to annual amounts
        const annualBasic = convertToAnnual(basicSalary, salaryPeriod);
        const annualTravel = convertToAnnual(travelAllowance, salaryPeriod);
        
        // Calculate taxable income (basic + 80% of travel allowance)
        const taxableTravel = annualTravel * travelAllowanceTaxableRate;
        const annualTaxableIncome = annualBasic + taxableTravel;
        
        // Calculate annual PAYE based on taxable income
        const annualPaye = calculatePaye(annualTaxableIncome, taxYear, age);
        
        // Calculate UIF (on full gross salary)
        const periodUif = calculateUif(periodGross, taxYear);
        
        // Calculate net salary (gross - PAYE - UIF)
        const periodPaye = convertFromAnnual(annualPaye, salaryPeriod);
        const periodNet = periodGross - periodPaye - periodUif;
        
        // Calculate annual gross for tax bracket display
        const annualGross = annualBasic + annualTravel;
        
        // Display results
        displayResults(basicSalary, travelAllowance, periodGross, periodPaye, periodUif, periodNet, annualTaxableIncome, taxYear);
    }

    // Backward calculation function (net to gross)
    function calculateBackward(netSalary, travelAllowance, taxYear, salaryPeriod, age) {
        // Use a combination of methods for robustness
        
        // First try binary search method (more stable than Newton-Raphson)
        const result = binarySearchGrossSalary(netSalary, travelAllowance, taxYear, salaryPeriod, age);
        
        if (result.success) {
            // Display results
            displayResults(
                result.periodBasic, 
                travelAllowance,
                result.periodGross, 
                result.periodPaye, 
                result.periodUif, 
                netSalary, 
                result.annualTaxableIncome, 
                taxYear
            );
            return;
        }
        
        // If binary search fails, try approximation
        const approximateResult = approximateGrossSalary(netSalary, travelAllowance, taxYear, salaryPeriod, age);
        
        if (approximateResult.success) {
            // Display results with a note about approximation
            displayResults(
                approximateResult.periodBasic,
                travelAllowance,
                approximateResult.periodGross, 
                approximateResult.periodPaye, 
                approximateResult.periodUif, 
                netSalary, 
                approximateResult.annualTaxableIncome, 
                taxYear
            );
            
            // Add a note about approximation
            document.getElementById('tax-bracket-text').innerHTML += 
                '<br><small>(Note: This is an approximate calculation)</small>';
            return;
        }
        
        // If all methods fail, show a more helpful error message
        alert('Unable to calculate an exact gross salary for this net amount. Try rounding to the nearest 100 or using the forward calculator to find a close match.');
    }
    
    // Binary search method for finding gross salary
    function binarySearchGrossSalary(netSalary, travelAllowance, taxYear, salaryPeriod, age) {
        // Set reasonable bounds for search
        // Lower bound: Net salary minus travel allowance (basic must be at least this much)
        // Upper bound: (Net salary - travel allowance) * 2 (basic unlikely to be more than double net)
        let lowerBound = Math.max(0, netSalary - travelAllowance);
        let upperBound = (netSalary - travelAllowance) * 2;
        
        // Increase upper bound for high tax brackets
        if (netSalary > 50000) {
            upperBound = (netSalary - travelAllowance) * 2.5;
        }
        
        const maxIterations = 50;
        const tolerance = 0.1; // Allow small difference for convergence
        
        for (let i = 0; i < maxIterations; i++) {
            const midPoint = (lowerBound + upperBound) / 2;
            
            // Calculate net from this basic salary guess
            const periodBasic = midPoint;
            const periodGross = periodBasic + travelAllowance;
            
            // Convert to annual
            const annualBasic = convertToAnnual(periodBasic, salaryPeriod);
            const annualTravel = convertToAnnual(travelAllowance, salaryPeriod);
            
            // Calculate taxable income (basic + 80% of travel)
            const taxableTravel = annualTravel * travelAllowanceTaxableRate;
            const annualTaxableIncome = annualBasic + taxableTravel;
            
            // Calculate PAYE and UIF
            const annualPaye = calculatePaye(annualTaxableIncome, taxYear, age);
            const periodUif = calculateUif(periodGross, taxYear);
            
            // Calculate net from guess
            const periodPaye = convertFromAnnual(annualPaye, salaryPeriod);
            const calculatedNet = periodGross - periodPaye - periodUif;
            
            // Check if we're close enough
            if (Math.abs(calculatedNet - netSalary) < tolerance) {
                return {
                    success: true,
                    periodBasic: periodBasic,
                    periodGross: periodGross,
                    periodPaye: periodPaye,
                    periodUif: periodUif,
                    annualTaxableIncome: annualTaxableIncome
                };
            }
            
            // Adjust bounds based on result
            if (calculatedNet < netSalary) {
                lowerBound = midPoint;
            } else {
                upperBound = midPoint;
            }
            
            // Check if bounds are too close (can't narrow further)
            if (upperBound - lowerBound < tolerance) {
                // Return the closest match
                return {
                    success: true,
                    periodBasic: periodBasic,
                    periodGross: periodGross,
                    periodPaye: periodPaye,
                    periodUif: periodUif,
                    annualTaxableIncome: annualTaxableIncome
                };
            }
        }
        
        // If we reach here, binary search didn't converge
        return { success: false };
    }
    
    // Simple approximation method as last resort
    function approximateGrossSalary(netSalary, travelAllowance, taxYear, salaryPeriod, age) {
        // Start with a simple approximation based on tax brackets
        let estimatedTaxRate = 0.18; // Default to lowest bracket
        
        // Adjust estimated tax rate based on net salary
        const annualNetEstimate = convertToAnnual(netSalary, salaryPeriod);
        
        if (annualNetEstimate > 200000) estimatedTaxRate = 0.26;
        if (annualNetEstimate > 300000) estimatedTaxRate = 0.31;
        if (annualNetEstimate > 400000) estimatedTaxRate = 0.36;
        if (annualNetEstimate > 600000) estimatedTaxRate = 0.39;
        if (annualNetEstimate > 800000) estimatedTaxRate = 0.41;
        if (annualNetEstimate > 1500000) estimatedTaxRate = 0.45;
        
        // Account for rebates (simplified)
        const annualRebate = taxRebates[taxYear][age];
        const periodRebateEquivalent = convertFromAnnual(annualRebate, salaryPeriod);
        
        // Account for travel allowance tax benefit
        const annualTravel = convertToAnnual(travelAllowance, salaryPeriod);
        const travelTaxBenefit = annualTravel * (1 - travelAllowanceTaxableRate); // 20% of travel is non-taxable
        const periodTravelBenefit = convertFromAnnual(travelTaxBenefit, salaryPeriod);
        
        // Estimate basic salary using inverse calculation
        // net = gross - (taxable * taxRate - rebate) - (gross * uifRate)
        // net = basic + travel - ((basic + travel*0.8) * taxRate - rebate) - ((basic + travel) * uifRate)
        
        // Simplified approximation
        const effectiveRate = 1 - (estimatedTaxRate * (1 - 0.2 * (travelAllowance / (netSalary + 0.0001)))) - uifRate;
        let approximateBasic = (netSalary - travelAllowance + (periodRebateEquivalent * estimatedTaxRate)) / effectiveRate;
        
        // Ensure basic salary is not negative
        approximateBasic = Math.max(0, approximateBasic);
        
        // Calculate gross
        const periodGross = approximateBasic + travelAllowance;
        
        // Verify the approximation
        const annualBasic = convertToAnnual(approximateBasic, salaryPeriod);
        const taxableTravel = annualTravel * travelAllowanceTaxableRate;
        const annualTaxableIncome = annualBasic + taxableTravel;
        const annualPaye = calculatePaye(annualTaxableIncome, taxYear, age);
        const periodUif = calculateUif(periodGross, taxYear);
        const periodPaye = convertFromAnnual(annualPaye, salaryPeriod);
        const calculatedNet = periodGross - periodPaye - periodUif;
        
        // If approximation is reasonably close
        if (Math.abs(calculatedNet - netSalary) < netSalary * 0.05) { // Within 5%
            return {
                success: true,
                periodBasic: approximateBasic,
                periodGross: periodGross,
                periodPaye: periodPaye,
                periodUif: periodUif,
                annualTaxableIncome: annualTaxableIncome
            };
        }
        
        // Try one refinement iteration
        const adjustmentFactor = netSalary / calculatedNet;
        approximateBasic = approximateBasic * adjustmentFactor;
        
        // Recalculate with refined approximation
        const refinedPeriodGross = approximateBasic + travelAllowance;
        const refinedAnnualBasic = convertToAnnual(approximateBasic, salaryPeriod);
        const refinedAnnualTaxableIncome = refinedAnnualBasic + taxableTravel;
        const refinedAnnualPaye = calculatePaye(refinedAnnualTaxableIncome, taxYear, age);
        const refinedPeriodUif = calculateUif(refinedPeriodGross, taxYear);
        const refinedPeriodPaye = convertFromAnnual(refinedAnnualPaye, salaryPeriod);
        const refinedCalculatedNet = refinedPeriodGross - refinedPeriodPaye - refinedPeriodUif;
        
        // If refined approximation is reasonably close
        if (Math.abs(refinedCalculatedNet - netSalary) < netSalary * 0.05) { // Within 5%
            return {
                success: true,
                periodBasic: approximateBasic,
                periodGross: refinedPeriodGross,
                periodPaye: refinedPeriodPaye,
                periodUif: refinedPeriodUif,
                annualTaxableIncome: refinedAnnualTaxableIncome
            };
        }
        
        return { success: false };
    }

    // Calculate PAYE tax
    function calculatePaye(annualTaxableIncome, taxYear, age) {
        // Find applicable tax bracket
        const brackets = taxBrackets[taxYear];
        let tax = 0;
        
        for (const bracket of brackets) {
            if (annualTaxableIncome >= bracket.min && annualTaxableIncome <= bracket.max) {
                tax = bracket.base + bracket.rate * (annualTaxableIncome - bracket.min + 1);
                break;
            }
        }
        
        // Apply rebate
        const rebate = taxRebates[taxYear][age];
        tax = Math.max(0, tax - rebate);
        
        return tax;
    }

    // Calculate UIF contribution
    function calculateUif(periodGross, taxYear) {
        const ceiling = uifCeiling[taxYear];
        const uifBase = Math.min(periodGross, ceiling);
        return uifBase * uifRate;
    }

    // Convert amount to annual based on period
    function convertToAnnual(amount, period) {
        switch (period) {
            case 'weekly':
                return amount * 52;
            case 'biweekly':
                return amount * 26;
            case 'monthly':
                return amount * 12;
            case 'yearly':
                return amount;
            default:
                return amount * 12;
        }
    }

    // Convert annual amount to period
    function convertFromAnnual(amount, period) {
        switch (period) {
            case 'weekly':
                return amount / 52;
            case 'biweekly':
                return amount / 26;
            case 'monthly':
                return amount / 12;
            case 'yearly':
                return amount;
            default:
                return amount / 12;
        }
    }

    // Display calculation results
    function displayResults(basic, travel, gross, paye, uif, net, annualTaxableIncome, taxYear) {
        // Update result values
        document.getElementById('result-basic').textContent = formatCurrency(basic);
        document.getElementById('result-travel').textContent = formatCurrency(travel);
        document.getElementById('result-gross').textContent = formatCurrency(gross);
        document.getElementById('result-paye').textContent = formatCurrency(paye);
        document.getElementById('result-uif').textContent = formatCurrency(uif);
        document.getElementById('result-net').textContent = formatCurrency(net);
        
        // Calculate taxable travel amount for display
        const taxableTravel = travel * travelAllowanceTaxableRate;
        document.getElementById('taxable-travel').textContent = formatCurrency(taxableTravel).replace('R', '');
        
        // Find tax bracket and update info
        const brackets = taxBrackets[taxYear];
        let taxBracket = null;
        
        for (const bracket of brackets) {
            if (annualTaxableIncome >= bracket.min && annualTaxableIncome <= bracket.max) {
                taxBracket = bracket;
                break;
            }
        }
        
        if (taxBracket) {
            document.getElementById('tax-rate').textContent = `${(taxBracket.rate * 100).toFixed(0)}%`;
            document.getElementById('tax-bracket-text').innerHTML = 
                `Based on your annual taxable income of ${formatCurrency(annualTaxableIncome)}, you fall into the <span id="tax-rate">${(taxBracket.rate * 100).toFixed(0)}%</span> tax bracket.`;
        }
        
        // Show/hide travel allowance note based on whether there is a travel allowance
        const travelNote = document.querySelector('.travel-allowance-note');
        if (travel > 0) {
            travelNote.style.display = 'block';
        } else {
            travelNote.style.display = 'none';
        }
        
        // Create and update chart
        updateChart(gross, paye, uif, net);
        
        // Show results container
        document.getElementById('results-container').style.display = 'block';
        
        // Scroll to results
        document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
    }

    // Format currency
    function formatCurrency(amount) {
        return 'R' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    // Create and update chart
    let taxChart = null;
    
    function updateChart(gross, paye, uif, net) {
        const ctx = document.getElementById('tax-breakdown-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (taxChart) {
            taxChart.destroy();
        }
        
        // Create new chart
        taxChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Take-Home Pay', 'PAYE Tax', 'UIF Contribution'],
                datasets: [{
                    data: [net, paye, uif],
                    backgroundColor: [
                        '#0DB3A6',
                        '#FF6B6B',
                        '#FFD166'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = ((value / gross) * 100).toFixed(1);
                                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Fetch latest tax tables from SARS (simulation)
    function fetchLatestTaxTables() {
        console.log('Checking for tax table updates from SARS...');
        // In a real implementation, this would make an API call or scrape the SARS website
        // For demonstration purposes, we're using the hardcoded values
    }

    // Initialize by fetching latest tax tables
    fetchLatestTaxTables();
});
