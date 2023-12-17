import requests

url = "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=5%2BiLUdFM3ACosoXvPUvW%2FA%3D%3D"

payload = {}
headers = {
    'Content-Type': 'application/json',
    'Cookie': ''

}

response = requests.get(url, headers=headers, data=payload, timeout=100)

response = requests.get(url, headers=headers, data=payload, timeout=100)

response = requests.get(url, headers=headers, data=payload, timeout=100)

print(response.text)
