import digitalOcean from "digitalocean";
import fs from "fs";
import readjson from "readjson";
import retry from "promise-retry";
import sshFingerprint from "ssh-fingerprint";
import childProcess from "child_process";

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
  const sshKey = fs.readFileSync("/home/mustack/.ssh/id_rsa.pub", "utf-8");
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
    size: SIZE_CHEAPEST,
    ssh_keys: [sshKeyFingerprint],
  });

  return waitForDropletToBeStarted(droplet.id);
}

function remotelyInstallNs2ServerOnDroplet(droplet) {
  const networkInterface = droplet.networks.v4.find(
    (networkInterface) => networkInterface.type === "public"
  );

  const ip = networkInterface.ip_address;

  console.log("Droplet created with ip", ip);

  return new Promise((resolve) => {
    const childProcess = spawn(
      getBashInstallString({
        ip,
        dropletId: droplet.id,
        STEAM_USERNAME,
        STEAM_PASSWORD,
        NS2_SERVER_PASSWORD,
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
  // const droplet = await createNewDroplet();
  const [droplet] = await client.droplets.list();
  await remotelyInstallNs2ServerOnDroplet(droplet);

  console.log("done");
} catch (e) {
  console.error(e);
}
