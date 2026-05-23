#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    // 1. Optimization: Speed up cin and cout
    // This detaches C++ streams from C streams and unties cin from cout
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    // Reading the number of test cases or total inputs

    if (!(cin >> n)) return 0;

    vector<long long> data(n);
    for (int i = 0; i < n; ++i) {
        // Efficiently reading large integers
        cin >> data[i];
    }

    // Example processing: Finding the largest number
    long long max_val = *max_element(data.begin(), data.end());

    cout << "Processed " << n << " items." << endl;
    cout << "Largest value: " << max_val << endl;

    return 0;
}
