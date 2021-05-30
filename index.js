import digitalOcean from "digitalocean";
import fs from "fs";
import readjson from "readjson";
import retry from "promise-retry";
import sshFingerprint from "ssh-fingerprint";
import childProcess from "child_process";
import delay from "delay";
import os from "os";

import { getBashInstallString } from "./getBashInstallString.js";

const { spawn } = childProcess;
const {
  STEAM_USERNAME,
  STEAM_PASSWORD,
  NS2_SERVER_PASSWORD,
  DIGITAL_OCEAN_TOKEN,
} = await readjson("./secrets.json");

const client = digitalOcean.client(DIGITAL_OCEAN_TOKEN);

const SIZE_CHEAPEST = "s-1vcpu-1gb"; //useful for debugging
const SIZE_CPU_OPTIMIZED = "c-2";

function getPublicIP(droplet) {
  const networkInterface = droplet.networks.v4.find(
    (networkInterface) => networkInterface.type === "public"
  );
  return networkInterface.ip_address;
}

function waitForDropletToBeStarted(dropletId) {
  return retry(
    async (retry) => {
      const droplet = await client.droplets.get(dropletId);

      if (droplet.status !== "active") {
        retry();
      } else {
        return droplet;
      }
    },
    {
      retries: 180,
      factor: 1,
      minTimeout: 1000,
    }
  );
}

// Kept around in case I want to go back to using snapshots
async function createFromSnapshot() {
  try {
    const [snapshot] = await client.snapshots.list();
    const droplet = await client.droplets.create({
      name: "game-server",
      region: "nyc3",
      image: snapshot.id,
      size: SIZE_CHEAPEST,
    });

    const startedDroplet = await waitForDropletToBeStarted(droplet.id);

    console.log(startedDroplet);
  } catch (e) {
    console.error(e);
  }
}

async function createNewDroplet() {
  const sshKey = fs.readFileSync(os.homedir() + "/.ssh/id_rsa.pub", "utf-8");
  const sshKeyFingerprint = sshFingerprint(sshKey);

  try {
    await client.account.createSshKey({
      name: "personal",
      public_key: sshKey,
    });
  } catch (e) {
    console.log("SSH key already exists on DO");
  }

  console.log("Creating DO droplet");
  const droplet = await client.droplets.create({
    name: "ns2-server",
    region: "nyc3",
    image: "ubuntu-20-04-x64",
    size: SIZE_CPU_OPTIMIZED,
    ssh_keys: [sshKeyFingerprint],
  });

  return waitForDropletToBeStarted(droplet.id);
}

function remotelyInstallNs2ServerOnDropletAndDestroyAfterDelay(
  droplet,
  delayInSeconds
) {
  const ip = getPublicIP(droplet);

  return new Promise((resolve) => {
    const childProcess = spawn(
      getBashInstallString({
        ip,
        dropletId: droplet.id,
        delayInSeconds,
        STEAM_USERNAME,
        STEAM_PASSWORD,
        NS2_SERVER_PASSWORD,
        DIGITAL_OCEAN_TOKEN,
      }),
      { stdio: "inherit", shell: true }
    );

    childProcess.on("exit", (code) => {
      console.log("Exited child process with code", code);
      resolve(code);
    });
  });
}

try {
  const droplet = await createNewDroplet();
  console.log("Waiting a bit before attempting to SSH");
  await delay(20000); // wait a few seconds for the SSH server to be ready
  // const [droplet] = await client.droplets.list();
  await remotelyInstallNs2ServerOnDropletAndDestroyAfterDelay(
    droplet,
    3600 / 2
  );

  console.log("Use the following command to connect:");
  console.log(`connect ${getPublicIP(droplet)}:27015`);
} catch (e) {
  console.error(e);
}
