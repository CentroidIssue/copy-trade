#include <bits/stdc++.h>
using namespace std;
const int maxN = 1e6 + 10;

int pre[maxN];
int n;
int rmq[maxN][22];
vector <int> v[maxN * 2];
int get(int l, int r){
    int k = __lg(r - l + 1);
    return min(rmq[l][k], rmq[r - (1 << k) + 1][k]);
}

signed main(){
    string s;
    cin >> s;
    for (int i = 0; i < s.length(); ++i){
        pre[i + 1] = 2 * (s[i] == '(') - 1;
    }
    n = s.length();
    for (int i = 1; i <= n; ++i){
        pre[i] += pre[i - 1];
        rmq[i][0] = pre[i];
        v[pre[i] + maxN].push_back(i);
    }
    for (int j = 1; j < 20; ++j){
        for (int i = 1; i <= n; ++i){
            if (i + (1 << (j - 1)) > n) break;
            rmq[i][j] = min(rmq[i][j - 1], rmq[i + (1 << (j - 1))][j - 1]);
        }
    }
    for (int i = 1; i <= n; ++i){
        int l = i, r = n + 1;
        while (l < r){
            int mid = (l + r) >> 1;
            if (get(i, mid) >= pre[i - 1]) l = mid + 1;
            else r = mid;
        }
        --l;
        int x = 
    }
}