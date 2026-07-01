import 'dotenv/config';
import { getDevices } from '../src/lib/teltonika';

async function checkStatusValue() {
  console.log("Checking raw device status field from Teltonika API...");
  try {
    const res = await getDevices();
    console.log("Response data structure:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Failed to query devices:", err);
  }
}

checkStatusValue();
