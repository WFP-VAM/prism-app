# WFP PRISM Frontend

This project is the front-end interface for the World Food Programme's [PRISM project](https://innovation.wfp.org/project/prism). It displays data, forecasts, and impact projections on a configurable map interface.

## Packages/Dependencies

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app), using the [Redux](https://redux.js.org/) and [Redux Toolkit](https://redux-toolkit.js.org/) template with TypeScript.

- **Styling & UI Library** Use [Material UI](https://material-ui.com/). Note that to use the [styles API](https://material-ui.com/styles/basics/) you can `import @material-ui/core/styles`.
- **Routing** Uses [React Router](https://reacttraining.com/react-router/web/guides/quick-start).
- **Mapping** Uses [MapBox](https://docs.mapbox.com/mapbox.js/api/v3.2.1/). To use the app, you will need to create a token and add it as `REACT_APP_MAPBOX_TOKEN` in a `.env` file at the root folder.
- **State Management** Uses [Redux](https://redux.js.org/introduction/getting-started)
- **Testing** Uses [Jest](https://jestjs.io/) with [Enzyme](https://enzymejs.github.io/enzyme/)

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn lint`

Runs `eslint` for all the source files. We use a custom Eslint configuration in `./eslintrc` along with [`prettier`](https://prettier.io/) (configured with `./.prettierrc`) to enforce consistency and code quality. If you would like eslint to try to automatically "fix" files if it can, run `yarn lint --fix`.

## Committing Code

By default, a pre-commit hook is defined to run linting tasks on all _staged_ code before allowing a commit. This occurs using the [lint-staged](https://github.com/okonet/lint-staged) package, and can be configured in `./package.json#lint-staged`. The precommit task can be run manually using `yarn precommit`.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
