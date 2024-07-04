import { render } from '@testing-library/react';

import { Provider } from 'react-redux';
import { store } from 'context/store';
import { BrowserRouter } from 'react-router-dom';
import LegendItem from '.';

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <LegendItem
          title="Some Legend Title"
          legendUrl="Some Legend Url"
          opacity={0.5}
          legend={[
            {
              value: 'Some test Legend value',
              color: '#000000', // Test color e.g. black
            },
          ]}
        >
          <div>Test Children</div>
        </LegendItem>
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
