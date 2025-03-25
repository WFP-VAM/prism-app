import { render } from '@testing-library/react';
import ActionsModal from '.';
import { AActions } from './actions';

test('renders actions modal', () => {
  const { container } = render(
    <ActionsModal open onClose={() => {}} actions={Object.values(AActions)} />,
  );
  expect(container).toMatchSnapshot();
});
