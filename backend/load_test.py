"""
Load test for the read-to-earn endpoint. Fires many concurrent requests
against POST /api/rewards/read/ using a real JWT, and reports how many
succeeded (200), how many were correctly throttled (429), and how many
were unexpected errors (5xx or anything else).

Usage: python load_test.py <username> <password>
"""
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

BASE_URL = "http://127.0.0.1:8000"
CONCURRENT_REQUESTS = 50


def get_token(username, password):
    resp = requests.post(
        f"{BASE_URL}/api/token/", data={"username": username, "password": password}
    )
    resp.raise_for_status()
    return resp.json()["access"]


def fire_request(token):
    try:
        resp = requests.post(
            f"{BASE_URL}/api/rewards/read/",
            headers={"Authorization": f"Bearer {token}"},
            json={"content_slug": "state-bank-ai-credit-pilot"},
            timeout=10,
        )
        return resp.status_code
    except requests.RequestException as e:
        return f"ERROR: {e}"


def main():
    if len(sys.argv) != 3:
        print("Usage: python load_test.py <username> <password>")
        sys.exit(1)

    username, password = sys.argv[1], sys.argv[2]
    print(f"Getting token for {username}...")
    token = get_token(username, password)

    print(f"Firing {CONCURRENT_REQUESTS} concurrent requests at /api/rewards/read/...")
    start = time.time()
    results = []
    with ThreadPoolExecutor(max_workers=CONCURRENT_REQUESTS) as executor:
        futures = [executor.submit(fire_request, token) for _ in range(CONCURRENT_REQUESTS)]
        for future in as_completed(futures):
            results.append(future.result())
    elapsed = time.time() - start

    counts = {}
    for r in results:
        counts[r] = counts.get(r, 0) + 1

    print(f"\nCompleted {CONCURRENT_REQUESTS} requests in {elapsed:.2f}s")
    print("Status code breakdown:")
    for status, count in sorted(counts.items(), key=lambda x: str(x[0])):
        print(f"  {status}: {count}")

    accepted = counts.get(200, 0)
    throttled = counts.get(429, 0)
    errors = sum(v for k, v in counts.items() if isinstance(k, str) or (isinstance(k, int) and k >= 500))

    print(f"\nAccepted (200): {accepted}")
    print(f"Throttled (429): {throttled}")
    print(f"Server errors: {errors}")

    if errors > 0:
        print("\n⚠ Server errors occurred under load — investigate before launch.")
    elif accepted + throttled != CONCURRENT_REQUESTS:
        print("\n⚠ Unexpected status codes present — investigate.")
    else:
        print("\n✓ No server errors under concurrent load. Rate limiting held.")


if __name__ == "__main__":
    main()
