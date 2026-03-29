# Buildkit - Build & Push Action

A minimally opinionated GitHub action for BuildKit's [`buildctl`](https://github.com/moby/buildkit/blob/master/docs/reference/buildctl.md).

# Requirements

- BuildKit's `buildctl` v0.28.1 or compatible has to be available in the path of the action runner, e.g. [act-buildkit-runner](https://github.com/omniproc/act-buildkit-runner).

# Inputs

| Name                       | Required | Type    | Description                                                                            | Example                                                                                                             |
| -------------------------- | -------- | ------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `debug`                    | No       | Boolean | Enable debug output in logs                                                            | `false`                                                                                                             |
| `addr`                     | Yes      | String  | Buildkitd address                                                                      | `tcp://buildkitd:1234`                                                                                              |
| `log-format`               | No       | String  | Log formatter: json or text                                                            | `text`                                                                                                              |
| `tlsdir`                   | No       | String  | Directory containing CA certificate, client certificate, and client key                | `/path/to/tls-data`                                                                                                 |
| `output`                   | Yes      | String  | Define exports for build result. `name=` may be left out if `tags` are provided.       | `type=image,name=ghcr.io/${{ github.repository }}:latest,ghcr.io/${{ github.repository }}:stable,push=true`         |
| `progress`                 | No       | String  | Set type of progress (auto, plain, tty, rawjson)                                       | `auto`                                                                                                              |
| `local`                    | No       | List    | Allow build access to the local directory (defaults to `context=.` and `dockerfile=.`) | <pre> local: \| <br>&emsp;context=.<br>&emsp;dockerfile=.<br></pre>                                                 |
| `frontend`                 | No       | String  | Define frontend used for build                                                         | `dockerfile.v0`                                                                                                     |
| `opt`                      | No       | List    | Define custom options for frontend                                                     | <pre> opt: \| <br>&emsp;filename=Dockerfile<br>&emsp;platform=linux/amd64<br></pre>                                 |
| `no-cache`                 | No       | Boolean | Disable cache for all the vertices                                                     | `true`                                                                                                              |
| `export-cache`             | No       | String  | Export build cache                                                                     | `type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max,push=true`                                  |
| `import-cache`             | No       | String  | Import build cache                                                                     | `type=registry,ref=ghcr.io/${{ github.repository }}:buildcache`                                                     |
| `secret`                   | No       | List    | Secret value exposed to the build                                                      | <pre> secret: \| <br>&emsp;id=foo,src=/path/to/foo<br>&emsp;id=bar,src=/path/to/bar<br></pre>                       |
| `allow`                    | No       | List    | Allow extra privileged entitlement                                                     | <pre> allow: \| <br>&emsp;network.host<br>&emsp;security.insecure<br></pre>                                         |
| `ssh`                      | No       | List    | Allow forwarding SSH agent or socket to the builder                                    | <pre> ssh: \| <br>&emsp;default<br>&emsp;key=$HOME/.ssh/id_rsa<br></pre>                                            |
| `registry-auth-tlscontext` | No       | String  | Overwrite TLS configuration when authenticating with registries                        | `host=https://myserver:2376,insecure=false,ca=/path/to/my/ca.crt,cert=/path/to/my/cert.crt,key=/path/to/my/key.crt` |
| `tags`                     | Yes      | List    | Image tags extending the `name`s used in the `output` input                            | <pre> tags: \| <br>&emsp;{{ github.repository }}:sha-ca56cb6<br>&emsp;{{ github.repository }}:latest<br></pre>      |
| `dryrun`                   | No       | Boolean | Only print the resulting `buildctl` command but do not actually execute it             | `false`                                                                                                             |

# Example usage

When pushing the built image make sure to have authenticated with the registry using e.g. [docker/login-action](https://github.com/docker/login-action) in a step before.

```yaml
name: Example
on:
  push
jobs:
  build:
    runs-on: ubuntu-24.04
    container:
      image: ghcr.io/omniproc/act-buildkit-runner:0.28.1
    steps: 
    - name: oci metadata
      id: meta
      uses: docker/metadata-action@v6
      with:
        images: |
          ghcr.io/${{ github.repository }}
        tags: |
          type=sha,event=branch
          type=raw,value=latest,enable={{is_default_branch}}
    - name: oci build
      uses: omniproc/buildkit-build-push-action@v2
      with:
        tags: ${{ steps.meta.outputs.tags }}
        addr: 'tcp://buildkitd:1234'
        output: 'type=image,push=false'
```

# Development

## Updating the BuildKit / Runner Version

This action's tests run inside the [act-buildkit-runner](https://github.com/omniproc/act-buildkit-runner) container. When a new runner version is published (tracking a new BuildKit release):

1. Update the runner image tag in `.github/workflows/ci.yml` (both jobs).
2. Update the version in the Requirements section and Example below.
3. Commit, push, and verify tests pass.

See [.github/workflows/README.md](.github/workflows/README.md) for workflow details.

## Making Changes

```bash
# Install dependencies and update package-lock.json
npm install

# When a new version of this action is ready, use ncc to bundle it.
npm run build

# Add everything to Git using conventional commits (https://www.conventionalcommits.org/en/v1.0.0/).
# The version bump and release is managed by release-please.
git add .
git commit
git push
```