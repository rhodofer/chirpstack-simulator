import asyncio
import websockets

async def test_conn():
    origins = [
        "https://falt.iofeteknoloji.com",
        "http://localhost:3000",
        "https://api-falt.iofeteknoloji.com",
        None
    ]
    for o in origins:
        headers = {"Origin": o} if o else {}
        try:
            print(f"Testing origin: {o}")
            async with websockets.connect("wss://api-falt.iofeteknoloji.com/api/v1/ws/live", additional_headers=headers) as ws:
                print(f"SUCCESS with origin {o}!")
                msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                print("Received msg:", msg)
                return
        except Exception as e:
            print(f"Failed with origin {o}: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
