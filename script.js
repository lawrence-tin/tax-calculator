// ZA Tax Calculator - JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {

    // --- UI Interaction Logic ---

    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Accordion functionality for FAQ
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            const content = item.querySelector('.accordion-content');
            const isActive = item.classList.contains('active');
            
            // Close all others
            accordionItems.forEach(other => {
                other.classList.remove('active');
                other.querySelector('.accordion-content').style.maxHeight = null;
                other.querySelector('.accordion-icon').textContent = '+';
            });

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
                item.querySelector('.accordion-icon').textContent = '×';
            }
        });
    });

    // --- Form Submission and API Calls ---

    const forwardForm = document.getElementById('forward-form');
    forwardForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            calculationType: 'forward',
            taxYear: document.getElementById('tax-year').value,
            salaryPeriod: document.getElementById('salary-period').value,
            basicSalary: parseFloat(document.getElementById('gross-salary').value),
            travelAllowance: parseFloat(document.getElementById('travel-allowance').value) || 0,
            age: document.getElementById('age').value,
        };
        
        if (isNaN(formData.basicSalary) || formData.basicSalary <= 0) {
            alert('Please enter a valid basic salary amount.');
            return;
        }
        
        performCalculation(formData);
    });

    const backwardForm = document.getElementById('backward-form');
    backwardForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            calculationType: 'backward',
            taxYear: document.getElementById('backward-tax-year').value,
            salaryPeriod: document.getElementById('backward-salary-period').value,
            netSalary: parseFloat(document.getElementById('net-salary').value),
            travelAllowance: parseFloat(document.getElementById('backward-travel-allowance').value) || 0,
            age: document.getElementById('backward-age').value,
        };

        if (isNaN(formData.netSalary) || formData.netSalary <= 0) {
            alert('Please enter a valid take-home pay amount.');
            return;
        }

        performCalculation(formData);
    });

    async function performCalculation(data) {
        try {
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                // Handle rate limiting and other errors
                if (response.status === 429) {
                    // This is where you would show a modal prompting signup
                    alert(result.error); 
                } else {
                    alert(`Error: ${result.error || 'Calculation failed'}`);
                }
                return;
            }
            
            // For backward calculation, the server returns the calculated basic salary
            // The server now returns all the necessary display values directly

            displayResults(
                result.basic,
                result.travel,
                result.gross,
                result.paye,
                result.uif,
                result.net,
                result.annualTaxableIncome,
                data.taxYear
            );

        } catch (error) {
            console.error('Calculation error:', error);
            alert('An unexpected error occurred. Please check your connection and try again.');
        }
    }

    // --- Results Display ---

    function displayResults(basic, travel, gross, paye, uif, net, annualTaxableIncome, taxYear) {
        document.getElementById('result-basic').textContent = formatCurrency(basic);
        document.getElementById('result-travel').textContent = formatCurrency(travel);
        document.getElementById('result-gross').textContent = formatCurrency(gross);
        document.getElementById('result-paye').textContent = formatCurrency(paye);
        document.getElementById('result-uif').textContent = formatCurrency(uif);
        document.getElementById('result-net').textContent = formatCurrency(net);
        
        const travelNote = document.querySelector('.travel-allowance-note');
        if (travel > 0) {
            const taxableTravel = travel * 0.8; // Hardcoded for display, server has definitive logic
            document.getElementById('taxable-travel').textContent = formatCurrency(taxableTravel).replace('R', '');
            travelNote.style.display = 'block';
        } else {
            travelNote.style.display = 'none';
        }

        // The tax bracket info is no longer sent from the client, so we remove it for now.
        // This could be added back by sending the tax bracket info from the server.
        const taxBracketInfo = document.querySelector('.tax-bracket-info');
        taxBracketInfo.style.display = 'none';


        updateChart(gross, paye, uif, net);
        
        document.getElementById('results-container').style.display = 'block';
        document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
    }

    function formatCurrency(amount) {
        if (typeof amount !== 'number') return 'R0.00';
        return 'R' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    let taxChart = null;
    function updateChart(gross, paye, uif, net) {
        const ctx = document.getElementById('tax-breakdown-chart').getContext('2d');
        if (taxChart) {
            taxChart.destroy();
        }
        taxChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Take-Home Pay', 'PAYE Tax', 'UIF Contribution'],
                datasets: [{
                    data: [net, paye, uif],
                    backgroundColor: ['#0DB3A6', '#FF6B6B', '#FFD166'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
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
});