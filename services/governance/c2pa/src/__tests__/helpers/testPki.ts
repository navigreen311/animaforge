/**
 * Hermetic PKI + RFC 3161 timestamp authority for exercising the REAL signing
 * path in tests.
 *
 * No certificates or private keys are committed to this repository: everything
 * here is generated into a temp directory at test time and thrown away. The
 * local TSA exists because c2pa-node requires a reachable timestamp authority
 * to sign at all — without it these tests would depend on the public internet.
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const CANDIDATE_OPENSSL = [
  process.env.OPENSSL_PATH,
  "openssl",
  "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
  "/usr/bin/openssl",
].filter((p): p is string => typeof p === "string" && p.length > 0);

let resolvedOpenssl: string | null | undefined;

/** Locate a usable openssl, or null. Memoised. */
export function findOpenssl(): string | null {
  if (resolvedOpenssl !== undefined) return resolvedOpenssl;
  for (const candidate of CANDIDATE_OPENSSL) {
    try {
      const result = spawnSync(candidate, ["version"], { stdio: "ignore" });
      if (result.status === 0) {
        resolvedOpenssl = candidate;
        return resolvedOpenssl;
      }
    } catch {
      // try the next candidate
    }
  }
  resolvedOpenssl = null;
  return null;
}

/** True when c2pa-node's native binding can be loaded in this environment. */
export function c2paNodeAvailable(): {
  available: boolean;
  error: string | null;
} {
  try {
    require("c2pa-node");
    return { available: true, error: null };
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const EXT_CNF = `
[ca_ext]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash

[leaf_ext]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,nonRepudiation
extendedKeyUsage = critical,emailProtection
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer

[tsa_ext]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,nonRepudiation
extendedKeyUsage = critical,timeStamping
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
`;

const TSA_CNF = `
[tsa]
default_tsa = tsa_config

[tsa_config]
dir = .
serial = tsa-serial
signer_cert = tsa.crt
certs = ca.crt
signer_key = tsa.key
signer_digest = sha256
default_policy = 1.3.6.1.4.1.99999.1
digests = sha256,sha512
accuracy = secs:1
ordering = yes
tsa_name = yes
ess_cert_id_chain = no
ess_cert_id_alg = sha256
`;

export interface TestPki {
  dir: string;
  /** Leaf + root, PEM concatenated — what C2PA_SIGNING_CERT wants. */
  chainPath: string;
  /** Leaf private key in PKCS#8 — c2pa-rs rejects SEC1 "EC PRIVATE KEY". */
  keyPath: string;
  tsaUrl: string;
  close: () => Promise<void>;
}

/**
 * Build a throwaway CA, an emailProtection signing leaf (the EKU the C2PA spec
 * requires), a timeStamping leaf, and start a local TSA on a random port.
 */
export async function startTestPki(): Promise<TestPki> {
  const openssl = findOpenssl();
  if (!openssl) throw new Error("openssl not found");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "animaforge-c2pa-test-"));
  const ssl = (args: string[]): void => {
    execFileSync(openssl, args, {
      cwd: dir,
      stdio: ["ignore", "pipe", "pipe"],
    });
  };

  fs.writeFileSync(path.join(dir, "ext.cnf"), EXT_CNF);
  fs.writeFileSync(path.join(dir, "tsa.cnf"), TSA_CNF);
  fs.writeFileSync(path.join(dir, "tsa-serial"), "01\n");

  ssl([
    "ecparam",
    "-name",
    "prime256v1",
    "-genkey",
    "-noout",
    "-out",
    "ca.key",
  ]);
  ssl([
    "req",
    "-new",
    "-x509",
    "-key",
    "ca.key",
    "-sha256",
    "-days",
    "3650",
    "-out",
    "ca.crt",
    "-subj",
    "/C=US/O=AnimaForge Test CA/CN=AnimaForge Test Root CA",
    "-config",
    "ext.cnf",
    "-extensions",
    "ca_ext",
  ]);

  ssl([
    "ecparam",
    "-name",
    "prime256v1",
    "-genkey",
    "-noout",
    "-out",
    "leaf.sec1.key",
  ]);
  ssl([
    "pkcs8",
    "-topk8",
    "-nocrypt",
    "-in",
    "leaf.sec1.key",
    "-out",
    "leaf.key",
  ]);
  ssl([
    "req",
    "-new",
    "-key",
    "leaf.key",
    "-out",
    "leaf.csr",
    "-subj",
    "/C=US/O=AnimaForge Test/OU=FOR TESTING ONLY/CN=AnimaForge Test Signer",
  ]);
  ssl([
    "x509",
    "-req",
    "-in",
    "leaf.csr",
    "-CA",
    "ca.crt",
    "-CAkey",
    "ca.key",
    "-CAcreateserial",
    "-out",
    "leaf.crt",
    "-days",
    "3650",
    "-sha256",
    "-extfile",
    "ext.cnf",
    "-extensions",
    "leaf_ext",
  ]);
  fs.writeFileSync(
    path.join(dir, "chain.pem"),
    Buffer.concat([
      fs.readFileSync(path.join(dir, "leaf.crt")),
      fs.readFileSync(path.join(dir, "ca.crt")),
    ]),
  );

  // openssl's timestamp responder is happiest with an RSA signer.
  ssl(["genrsa", "-out", "tsa.key", "2048"]);
  ssl([
    "req",
    "-new",
    "-key",
    "tsa.key",
    "-out",
    "tsa.csr",
    "-subj",
    "/C=US/O=AnimaForge Test/OU=FOR TESTING ONLY/CN=AnimaForge Test TSA",
  ]);
  ssl([
    "x509",
    "-req",
    "-in",
    "tsa.csr",
    "-CA",
    "ca.crt",
    "-CAkey",
    "ca.key",
    "-CAcreateserial",
    "-out",
    "tsa.crt",
    "-days",
    "3650",
    "-sha256",
    "-extfile",
    "ext.cnf",
    "-extensions",
    "tsa_ext",
  ]);

  let counter = 0;
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try {
        const id = `q${counter++}`;
        fs.writeFileSync(path.join(dir, `${id}.tsq`), Buffer.concat(chunks));
        ssl([
          "ts",
          "-reply",
          "-config",
          "tsa.cnf",
          "-queryfile",
          `${id}.tsq`,
          "-out",
          `${id}.tsr`,
        ]);
        const body = fs.readFileSync(path.join(dir, `${id}.tsr`));
        res.writeHead(200, {
          "Content-Type": "application/timestamp-reply",
          "Content-Length": body.length,
        });
        res.end(body);
      } catch {
        res.writeHead(500).end();
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    dir,
    chainPath: path.join(dir, "chain.pem"),
    keyPath: path.join(dir, "leaf.key"),
    tsaUrl: `http://127.0.0.1:${port}/tsa`,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
