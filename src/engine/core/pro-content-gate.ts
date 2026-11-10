/**
 * Switch for pro-only content packs (hero meshes, solar-system pack) that load outside the plugin
 * manifest. Allowed by default. The embed switches it off for an open-edition license in a pro build,
 * before the engine registers its content. The normal site never touches it.
 */
let isProContentAllowed_ = true;

export const isProContentAllowed = (): boolean => isProContentAllowed_;

export const setProContentAllowed = (allowed: boolean): void => {
  isProContentAllowed_ = allowed;
};
