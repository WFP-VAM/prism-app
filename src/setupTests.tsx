// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

function stubMuiComponent(componentName: string) {
  jest.doMock(
    `@material-ui/core/${componentName}/${componentName}`,
    () => `mock-${componentName}`,
  );
}

stubMuiComponent('Typography');
stubMuiComponent('Button');
stubMuiComponent('TextField');
stubMuiComponent('Avatar');
stubMuiComponent('Tabs');
stubMuiComponent('Tab');
stubMuiComponent('AppBar');
stubMuiComponent('Toolbar');
stubMuiComponent('Tooltip');
stubMuiComponent('Link');
stubMuiComponent('Card');
stubMuiComponent('CardContent');
stubMuiComponent('Chip');
stubMuiComponent('List');
stubMuiComponent('ListItem');
stubMuiComponent('ListItemText');
stubMuiComponent('Menu');
stubMuiComponent('MenuItem');
stubMuiComponent('Modal');
stubMuiComponent('Popover');
stubMuiComponent('CircularProgress');
stubMuiComponent('Hidden');
stubMuiComponent('ExpansionPanel');
stubMuiComponent('ExpansionPanelSummary');
stubMuiComponent('ExpansionPanelDetails');
stubMuiComponent('Checkbox');
stubMuiComponent('Drawer');
stubMuiComponent('Divider');
stubMuiComponent('Snackbar');
stubMuiComponent('Stepper');
stubMuiComponent('StepButton');
stubMuiComponent('Step');
stubMuiComponent('Switch');
stubMuiComponent('Dialog');
stubMuiComponent('DialogActions');
stubMuiComponent('DialogContent');
stubMuiComponent('DialogContentText');
stubMuiComponent('DialogTitle');
