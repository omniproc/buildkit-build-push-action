const core = require('@actions/core');
const exec = require('@actions/exec');

function transformInputKey(key) {
  // Replace underscores with dashes
  return key.replace(/_/g, '-');
}

function getStringInput(key, required = false) {
  // Return the input value prefixed by the key
  if (core.getInput(transformInputKey(key), { required: required }).length !== 0) {
    return `--${transformInputKey(key)} ${core.getInput(transformInputKey(key))}`;
  }
  return ''
}

function getBooleanInput(key, required = false) {
  // Return the key if the input is true, otherwise return an empty string
  if (core.getBooleanInput(transformInputKey(key), { required: required }) === true) {
    return `--${transformInputKey(key)}`
  }
  return ''
}

function getArrayInput(key, required = false) {
  // Return the key with each element of the input array prefixed by the key
  return core.getMultilineInput(key, { required: required }).map(element => `--${transformInputKey(key)} ${element}`).join(' ');
}

function extendName(inputString, additionalNames) {
  const parts = inputString.split(',');

  // Find the part that starts with 'name='
  const namePartIndex = parts.findIndex(part => part.startsWith('name='));

  if (namePartIndex === -1) {
    // If 'name=' part is not found, create a new one with the additional names
    const extendedNames = additionalNames.join(',');
    // Wrap the extended names in escaped quotes, the result buildctl expects looks like this: type=image,push=true,\"name=...\"
    // The arguments provided to the exec.exec() function are escaped by _uvQuoteCmdArg() in the toolkit, see:
    // https://github.com/actions/toolkit/blob/af45ad8eaa9ccbb742e6c2967385a85becf6527a/packages/exec/src/toolrunner.ts#L276
    parts.push(`\"name=${extendedNames}\"`);
  } else {
    // Extract the current name value
    const namePart = parts[namePartIndex];
    const currentNames = namePart.split('=')[1];
    // Extend the name value with additional names
    const extendedNames = [currentNames, ...additionalNames].join(',');
    // Wrap the extended names in escaped quotes, the result buildctl expects looks like this: type=image,push=true,\"name=...\"
    // The arguments provided to the exec.exec() function are escaped by _uvQuoteCmdArg() in the toolkit, see:
    // https://github.com/actions/toolkit/blob/af45ad8eaa9ccbb742e6c2967385a85becf6527a/packages/exec/src/toolrunner.ts#L276
    parts[namePartIndex] = `\"name=${extendedNames}\"`;
  }
  // Join the parts back into a single string
  return parts.join(',');
}

async function run() {
  try {
    // Get the input parameters
    // variable names equal command parameter names with dashes replaced by underscores
    // ----- buildctl global -----
    const debug = getBooleanInput('debug');
    const addr = getStringInput('addr', true);
    const log_format = getStringInput('log_format');
    const tlsdir = getStringInput('tlsdir');
    // ----- build command -----
    const _output = core.getInput('output', { required: true });
    const progress = getStringInput('progress');
    const local = getArrayInput('local');
    const frontend = getStringInput('frontend');
    const opt = getArrayInput('opt');
    const no_cache = getBooleanInput('no_cache');
    const export_cache = getStringInput('export_cache');
    const import_cache = getStringInput('import_cache');
    const secret = getArrayInput('secret');
    const registry_auth_tls_context = getStringInput('registry_auth_tls_context');
    // ----- action ux -----
    const _tags = core.getMultilineInput('tags', { required: true });
    const _dryrun = core.getBooleanInput('dryrun');

    // Build the command to be executed
    // Construct the output string based on the output input and optional tags
    const output = `--output ${extendName(_output, _tags)}`;
    const arguments = [`${debug}`, `${addr}`, `${log_format}`, `${tlsdir}`, 'build', `${output}`, `${progress}`, `${local}`, `${frontend}`, `${opt}`, `${no_cache}`, `${export_cache}`, `${import_cache}`, `${secret}`, `${registry_auth_tls_context}`].filter(arg => arg !== '');

    // When logging to console print the command as it is actually executed including it's \" escape sequences
    const _arguments = arguments.join(' ').replace(/\"/g, '\\\"');

    if (_dryrun === true) {
      console.log('Dryrun flag set. Command will be logged but not executed.')
      console.log(`buildctl ${_arguments}`);
    }
    else {
      console.log('Executing buildctl command...');
      // Log the command to be executed. exec.exec() does log the command itself BUT does some funny escaping after the fact. The actually executed command is not properly logged by exec.exec(). Thus we log it here for better visibility of what is actually executed.
      console.log(`buildctl ${_arguments}`);
      await exec.exec('buildctl', arguments.map(str => str.split(' ')).flat());
      console.log('Buildctl command succeeded (exit status 0).');
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run();