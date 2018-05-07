import { exec } from "child_process";

var pr = exec("eb deploy -l dncash-io-" + process.env.npm_package_version);
pr.stdout.pipe(process.stdout);
pr.stderr.pipe(process.stderr);
