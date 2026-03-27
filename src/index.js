import * as core from '@actions/core';
import * as exec from '@actions/exec';

// Replace underscores with dashes to map JS variable names to CLI flag names
export function transformInputKey(key) {
  return key.replace(/_/g, '-');
}

// Return ['--key', 'value'] if the input is non-empty, otherwise []
export function getStringInput(key, required = false) {
  const flag = transformInputKey(key);
  const value = core.getInput(flag, { required });
  if (value.length === 0) return [];
  return [`--${flag}`, value];
}

// Return ['--key'] if the input is true, otherwise []
export function getBooleanInput(key, required = false) {
  const flag = transformInputKey(key);
  if (core.getBooleanInput(flag, { required })) return [`--${flag}`];
  return [];
}

// Return ['--key', 'elem1', '--key', 'elem2', ...] for each line of multiline input, otherwise []
export function getArrayInput(key, required = false) {
  const flag = transformInputKey(key);
  return core.getMultilineInput(flag, { required }).flatMap(element => [`--${flag}`, element]);
}

// Extend or create the name= part of an output string with additional image tags.
// Wraps names in escaped quotes for buildctl: type=image,push=true,\"name=...\"
// The arguments provided to the exec.exec() function are escaped by _uvQuoteCmdArg() in the toolkit, see:
// https://github.com/actions/toolkit/blob/af45ad8eaa9ccbb742e6c2967385a85becf6527a/packages/exec/src/toolrunner.ts#L276
export function extendName(inputString, additionalNames) {
  const parts = inputString.split(',');

  // Find the part that starts with 'name='
  const namePartIndex = parts.findIndex(part => part.startsWith('name='));

  if (namePartIndex === -1) {
    // If 'name=' part is not found, create a new one with the additional names
    const extendedNames = additionalNames.join(',');
    parts.push(`\"name=${extendedNames}\"`);
  } else {
    // Extract the current name value and extend it with additional names
    const currentNames = parts[namePartIndex].split('=')[1];
    const extendedNames = [currentNames, ...additionalNames].join(',');
    parts[namePartIndex] = `\"name=${extendedNames}\"`;
  }

  // Join the parts back into a single string
  return parts.join(',');
}

export async function run() {
  try {
    // Get the input parameters
    // Variable names use underscores which transformInputKey converts to dashes
    // matching the action.yml input names and buildctl CLI flags
    // ----- buildctl global flags -----
    const debug = getBooleanInput('debug');
    const addr = getStringInput('addr', true);
    const logFormat = getStringInput('log_format');
    const tlsdir = getStringInput('tlsdir');

    // ----- build command flags -----
    const rawOutput = core.getInput('output', { required: true });
    const progress = getStringInput('progress');
    const local = getArrayInput('local');
    const frontend = getStringInput('frontend');
    const opt = getArrayInput('opt');
    const noCache = getBooleanInput('no_cache');
    const exportCache = getStringInput('export_cache');
    const importCache = getStringInput('import_cache');
    const secret = getArrayInput('secret');
    const allow = getArrayInput('allow');
    const ssh = getArrayInput('ssh');
    const registryAuthTlscontext = getStringInput('registry_auth_tlscontext');

    // ----- action ux -----
    const tags = core.getMultilineInput('tags', { required: true });
    const dryrun = core.getBooleanInput('dryrun');

    // Build the command to be executed
    // Construct the output string based on the output input and optional tags
    const output = ['--output', extendName(rawOutput, tags)];

    // Build the full argument list as a proper array
    const args = [
      ...debug,
      ...addr,
      ...logFormat,
      ...tlsdir,
      'build',
      ...output,
      ...progress,
      ...local,
      ...frontend,
      ...opt,
      ...noCache,
      ...exportCache,
      ...importCache,
      ...secret,
      ...allow,
      ...ssh,
      ...registryAuthTlscontext,
    ];

    // Log the command as space-separated args
    const formattedCmd = `buildctl ${args.join(' ')}`;

    if (dryrun) {
      console.log('Dryrun flag set. Command will be logged but not executed.');
      console.log(formattedCmd);
    } else {
      console.log('Executing buildctl command...');
      // Log the command to be executed. exec.exec() does log the command itself BUT does some funny
      // escaping after the fact. The actually executed command is not properly logged by exec.exec().
      // Thus we log it here for better visibility of what is actually executed.
      console.log(formattedCmd);
      await exec.exec('buildctl', args);
      console.log('Buildctl command succeeded (exit status 0).');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();