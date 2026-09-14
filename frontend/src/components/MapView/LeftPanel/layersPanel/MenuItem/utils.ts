export { layerMenuItemAccordionSx } from '../layerPanelStyles';

export const makeSafeIDFromTitle = (title: string): string =>
  title.replace(/ /g, '').replace(/[\u{0080}-\u{FFFF}]/gu, '');
