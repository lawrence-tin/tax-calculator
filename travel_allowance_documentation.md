# Travel Allowance Feature Documentation

## Overview

The ZA Tax Calculator now includes support for travel allowance in both forward and backward calculations. This document explains how travel allowance is handled according to South African tax regulations.

## Tax Treatment of Travel Allowance

According to SARS regulations:

1. **80% of travel allowance** is included in taxable income for PAYE calculation
2. **100% of travel allowance** is included in the gross salary for UIF calculation
3. **100% of travel allowance** is included in the take-home pay

This special tax treatment provides a tax benefit for employees who receive a travel allowance as part of their compensation package.

## Forward Calculation (Gross to Net)

When calculating from gross salary to net pay with a travel allowance:

1. The user enters their basic salary and travel allowance separately
2. The system calculates the taxable income as: basic salary + (travel allowance × 80%)
3. PAYE tax is calculated based on this taxable income
4. UIF is calculated on the full gross amount (basic salary + travel allowance)
5. Take-home pay is calculated as: basic salary + travel allowance - PAYE - UIF

## Backward Calculation (Net to Gross)

When calculating from desired take-home pay to gross salary with a travel allowance:

1. The user enters their desired take-home pay and travel allowance
2. The system uses advanced algorithms to determine the required basic salary
3. The calculation accounts for the 80% taxable portion of travel allowance
4. The result shows the basic salary needed to achieve the desired take-home pay

## Implementation Details

The calculator uses three methods to ensure reliable backward calculations:

1. **Binary Search Method**: Systematically narrows down the correct basic salary
2. **Approximation Method**: Uses tax bracket estimation with refinement
3. **Fallback Mechanism**: Ensures a reasonable result even in edge cases

## User Interface

The calculator interface has been updated with:

1. Separate input fields for basic salary and travel allowance
2. Tooltip information explaining the 80% taxable rule
3. Updated results display showing basic salary, travel allowance, and gross salary
4. A note in the results showing the taxable portion of travel allowance

## Example Calculation

For a monthly basic salary of R15,000 with a travel allowance of R5,000:

- Gross salary: R20,000
- Taxable income: R15,000 + (R5,000 × 80%) = R19,000
- PAYE calculation based on R19,000 annual equivalent
- UIF calculation based on R20,000 (subject to ceiling)
- Take-home pay: R20,000 - PAYE - UIF

## References

1. SARS Guide for Employers in respect of Allowances (2026 tax year)
2. Tax Consulting South Africa - Travel Allowances
3. SARS Income Tax Act regulations
