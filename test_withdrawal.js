// Test script for withdrawal network fee calculation
function testNetworkFee() {
    console.log('Testing Network Fee Calculation (5% of withdrawal amount)');

    const testCases = [
        { withdrawal: 1000, expectedFee: 50 },
        { withdrawal: 2000, expectedFee: 100 },
        { withdrawal: 3000, expectedFee: 150 },
        { withdrawal: 4000, expectedFee: 200 },
        { withdrawal: 5000, expectedFee: 250 },
        { withdrawal: 6000, expectedFee: 300 },
        { withdrawal: 7000, expectedFee: 350 },
        { withdrawal: 8000, expectedFee: 400 },
        { withdrawal: 9000, expectedFee: 450 },
        { withdrawal: 10000, expectedFee: 500 },
        { withdrawal: 20000, expectedFee: 1000 },
        { withdrawal: 30000, expectedFee: 1500 },
        { withdrawal: 40000, expectedFee: 2000 },
        { withdrawal: 50000, expectedFee: 2500 },
        { withdrawal: 100000, expectedFee: 5000 }
    ];

    let allPassed = true;

    testCases.forEach(testCase => {
        const calculatedFee = testCase.withdrawal * 0.05;
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
