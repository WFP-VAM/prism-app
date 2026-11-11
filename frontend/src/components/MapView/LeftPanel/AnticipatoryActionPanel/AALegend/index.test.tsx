import { render, screen } from '@testing-library/react';
import { Panel } from 'config/types';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import AALegend from '.';

const mockStore = configureStore([]);

const renderLegend = (categories: Record<string, boolean> = {}) =>
  render(
    <Provider
      store={mockStore({
        leftPanelState: {
          tabValue: Panel.AnticipatoryActionDrought,
        },
        anticipatoryActionDroughtState: {
          showPhaseLabels: true,
          filters: { categories },
        },
      })}
    >
      <AALegend />
    </Provider>,
  );

test('renders as expected', () => {
  const { container } = renderLegend();
  expect(container).toMatchSnapshot();
});

test('leaves out unticked categories', () => {
  renderLegend({ Mild: false });
  expect(screen.queryByText('Mild')).toBeNull();
  expect(screen.getAllByText('Moderate')).toHaveLength(2);
  expect(screen.getByText('No Action')).toBeTruthy();
  expect(screen.getByText('Not Yet Monitored')).toBeTruthy();
});
