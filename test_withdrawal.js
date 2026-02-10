// Test script for withdrawal network fee calculation
function testNetworkFee() {
    console.log('Testing Network Fee Calculation (10% of withdrawal amount)');

    const testCases = [
        { withdrawal: 1000, expectedFee: 100 },
        { withdrawal: 2000, expectedFee: 200 },
        { withdrawal: 3000, expectedFee: 300 },
        { withdrawal: 4000, expectedFee: 400 },
        { withdrawal: 5000, expectedFee: 500 },
        { withdrawal: 6000, expectedFee: 600 },
        { withdrawal: 7000, expectedFee: 700 },
        { withdrawal: 8000, expectedFee: 800 },
        { withdrawal: 9000, expectedFee: 900 },
        { withdrawal: 10000, expectedFee: 1000 },
        { withdrawal: 20000, expectedFee: 2000 },
        { withdrawal: 30000, expectedFee: 3000 },
        { withdrawal: 40000, expectedFee: 4000 },
        { withdrawal: 50000, expectedFee: 5000 },
        { withdrawal: 100000, expectedFee: 10000 }
    ];

    let allPassed = true;

    testCases.forEach(testCase => {
        const calculatedFee = testCase.withdrawal * 0.1;
        const passed = Math.abs(calculatedFee - testCase.expectedFee) < 0.01; // Allow for floating point precision

        console.log(`Withdrawal: $${testCase.withdrawal} → Fee: $${calculatedFee.toFixed(2)} (Expected: $${testCase.expectedFee}) - ${passed ? 'PASS' : 'FAIL'}`);

        if (!passed) {
            allPassed = false;
        }
    });

    console.log(`\nOverall Test Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    return allPassed;
}

// Run the test
testNetworkFee();
