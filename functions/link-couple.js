/**
 * link-couple.js — One-time script to connect two users as a couple in Firestore.
 *
 * Usage: node link-couple.js
 *
 * This script:
 *  1. Searches for any existing couple document containing either UID
 *  2. If found, updates it to include both UIDs
 *  3. If not found, creates a new couple document with both UIDs
 *  4. Updates both user documents to reference the same coupleId
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Build Application Default Credentials from the Firebase CLI's refresh token.
// The Firebase CLI stores its OAuth tokens in ~/.config/configstore/firebase-tools.json.
// We create a temporary ADC JSON file so that firebase-admin can authenticate
// using the same identity as the logged-in Firebase CLI user.
const configPath = path.join(
  process.env.HOME || "/root",
  ".config/configstore/firebase-tools.json"
);
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const refreshToken = firebaseConfig.tokens.refresh_token;

const adcContent = {
  type: "authorized_user",
  client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
  client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
  refresh_token: refreshToken,
};

const adcPath = path.join(os.tmpdir(), "firebase-adc-temp.json");
fs.writeFileSync(adcPath, JSON.stringify(adcContent));
process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;

admin.initializeApp({ projectId: "organizador-financeiro-a431c" });

const db = admin.firestore();

const UID_A = "SAiJu9TEYwaqUlbkFWEe4UlM6gW2";
const UID_B = "cIwh0JGXpMcfRxxd9lsoKv2Uy4m1";

async function main() {
  console.log("=== Link Couple Script ===");
  console.log(`UID A: ${UID_A}`);
  console.log(`UID B: ${UID_B}`);
  console.log("");

  try {
    // 1. Search for existing couple documents containing either UID
    console.log("Searching for existing couple documents...");

    const queryA = await db
      .collection("couples")
      .where("partnerIds", "array-contains", UID_A)
      .get();

    const queryB = await db
      .collection("couples")
      .where("partnerIds", "array-contains", UID_B)
      .get();

    // Merge results, deduplicating by document ID
    const coupleDocsMap = new Map();
    queryA.docs.forEach((doc) => coupleDocsMap.set(doc.id, doc));
    queryB.docs.forEach((doc) => coupleDocsMap.set(doc.id, doc));

    const coupleDocs = Array.from(coupleDocsMap.values());

    console.log(`Found ${coupleDocs.length} existing couple document(s).`);

    let coupleId;

    if (coupleDocs.length > 0) {
      // Use the first existing couple document
      const existingDoc = coupleDocs[0];
      coupleId = existingDoc.id;
      const existingData = existingDoc.data();
      const existingPartners = existingData.partnerIds || [];

      console.log(`\nExisting couple found: ${coupleId}`);
      console.log(`Current partnerIds: [${existingPartners.join(", ")}]`);

      // Check if both UIDs are already present
      const hasA = existingPartners.includes(UID_A);
      const hasB = existingPartners.includes(UID_B);

      if (hasA && hasB) {
        console.log("Both UIDs are already in this couple document.");
      } else {
        // Add the missing UID(s)
        if (!hasA) {
          console.log(`Adding UID A (${UID_A}) to couple...`);
        }
        if (!hasB) {
          console.log(`Adding UID B (${UID_B}) to couple...`);
        }

        await db
          .collection("couples")
          .doc(coupleId)
          .update({
            partnerIds: admin.firestore.FieldValue.arrayUnion(UID_A, UID_B),
          });

        console.log("Couple document updated with both UIDs.");
      }

      // Log if there are additional couple docs (potential data inconsistency)
      if (coupleDocs.length > 1) {
        console.log(
          `\nWARNING: Found ${coupleDocs.length} couple documents containing these UIDs.`
        );
        console.log("Only the first one was used. Other couple IDs:");
        coupleDocs.slice(1).forEach((doc) => {
          console.log(`  - ${doc.id} (partnerIds: [${(doc.data().partnerIds || []).join(", ")}])`);
        });
      }
    } else {
      // No existing couple found — create a new one
      console.log("\nNo existing couple found. Creating a new couple document...");

      const newCoupleRef = await db.collection("couples").add({
        partnerIds: [UID_A, UID_B],
        splitRule: "percentage",
        splitRatio: {
          [UID_A]: 50,
          [UID_B]: 50,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      coupleId = newCoupleRef.id;
      console.log(`New couple document created: ${coupleId}`);
    }

    // 2. Update both user documents with the coupleId
    console.log(`\nUpdating user documents with coupleId: ${coupleId}`);

    const batch = db.batch();
    batch.set(
      db.collection("users").doc(UID_A),
      { coupleId },
      { merge: true }
    );
    batch.set(
      db.collection("users").doc(UID_B),
      { coupleId },
      { merge: true }
    );
    await batch.commit();

    console.log(`  User ${UID_A} -> coupleId: ${coupleId}`);
    console.log(`  User ${UID_B} -> coupleId: ${coupleId}`);

    // 3. Verify the final state
    console.log("\n=== Verification ===");

    const coupleSnap = await db.collection("couples").doc(coupleId).get();
    const coupleData = coupleSnap.data();
    console.log(`Couple ${coupleId}:`);
    console.log(`  partnerIds: [${(coupleData.partnerIds || []).join(", ")}]`);
    console.log(`  splitRule: ${coupleData.splitRule}`);
    console.log(`  splitRatio: ${JSON.stringify(coupleData.splitRatio)}`);

    const userASnap = await db.collection("users").doc(UID_A).get();
    const userBSnap = await db.collection("users").doc(UID_B).get();

    console.log(`User ${UID_A}: coupleId = ${userASnap.exists ? userASnap.data().coupleId : "NOT FOUND"}`);
    console.log(`User ${UID_B}: coupleId = ${userBSnap.exists ? userBSnap.data().coupleId : "NOT FOUND"}`);

    console.log("\nDone! Users are now linked as a couple.");
  } catch (error) {
    console.error("\nERROR:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main().then(() => {
  // Clean up temporary ADC file
  try { fs.unlinkSync(adcPath); } catch (_) { /* ignore */ }
  process.exit(0);
}).catch(() => {
  try { fs.unlinkSync(adcPath); } catch (_) { /* ignore */ }
  process.exit(1);
});
