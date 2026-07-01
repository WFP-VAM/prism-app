import type { SxProps, Theme } from '@mui/material/styles';
import { lightGrey } from 'muiTheme';

export const mapExportPrintContainerSx = {
  width: '100%',
  height: '100%',
} satisfies SxProps<Theme>;

export const mapExportMapContainerSx = {
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  width: '100%',
  zIndex: 1,
} satisfies SxProps<Theme>;

export const mapExportTitleOverlaySx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 2,
  color: 'black',
  backgroundColor: 'white',
  width: '100%',
  textAlign: 'center',
  fontSize: '1.25rem',
  fontWeight: 600,
  padding: '8px 0 8px 0',
  borderBottom: `1px solid ${lightGrey}`,
} satisfies SxProps<Theme>;

export const mapExportFooterOverlaySx = {
  padding: '8px',
  position: 'absolute',
  bottom: 0,
  left: 0,
  zIndex: 3,
  color: 'black',
  backgroundColor: 'white',
  width: '100%',
  boxSizing: 'border-box',
  borderTop: `1px solid ${lightGrey}`,
} satisfies SxProps<Theme>;

export const mapExportPreviewContainerSx = {
  height: '100%',
  width: '100%',
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
} satisfies SxProps<Theme>;
