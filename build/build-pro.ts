import { readFileSync, writeFileSync } from 'fs';

export const enablepro = (isPro) => {
  if (isPro) {
    const pluginsFile = 'src/plugins/plugins.ts';
    let pluginsContent = readFileSync(pluginsFile, 'utf-8');

    pluginsContent = replaceWithProPath(pluginsContent);

    writeFileSync(pluginsFile, pluginsContent, 'utf-8');
  } else {
    const pluginsFile = 'src/plugins/plugins.ts';
    let pluginsContent = readFileSync(pluginsFile, 'utf-8');

    pluginsContent = replaceWithAGPLPath(pluginsContent);
    writeFileSync(pluginsFile, pluginsContent, 'utf-8');
  }
};

/**
 * Replaces occurrences of the pro plugin path with the AGPL plugin path in the provided content.
 *
 * @param {string} pluginsContent - The content in which to replace plugin paths.
 * @returns {string} The updated content with AGPL plugin paths.
 */
function replaceWithAGPLPath(pluginsContent) {
  pluginsContent = pluginsContent.replace(
    '\'../plugins-pro/initial-orbit/initial-orbit\'',
    '\'../plugins/initial-orbit/initial-orbit\'',
  );
  console.log('Replaced initial-orbit plugin path with open source version in plugins.ts');

  return pluginsContent;
}

/**
 * Replaces the path to the 'initial-orbit' plugin in the given content string
 * with the pro version path.
 *
 * @param {string} pluginsContent - The content string containing plugin paths.
 * @returns {string} The updated content string with the pro plugin path.
 */
function replaceWithProPath(pluginsContent) {
  pluginsContent = pluginsContent.replace(
    '\'../plugins/initial-orbit/initial-orbit\'',
    '\'../plugins-pro/initial-orbit/initial-orbit\'',
  );
  console.log('Replaced initial-orbit plugin path with pro version in plugins.ts');

  return pluginsContent;
}

