// Expo SDK 54+ getDefaultConfig auto-detects npm workspaces. We extend its
// watchFolders so Metro picks up changes in workspace packages (e.g. @eventer/shared)
// without disabling hierarchical lookup — that breaks Expo's own resolution.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

module.exports = config;
