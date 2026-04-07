import type { ComponentType, PropsWithChildren } from 'react';
import { BrowserRouter, type BrowserRouterProps } from 'react-router-dom';

/**
 * react-router-dom v5's BrowserRouter class component typings disagree with
 * @types/react 18's JSX expectations ("refs" on Component). Cast once here
 * so tests can use a router without per-file assertions.
 */
export const TestBrowserRouter: ComponentType<
  PropsWithChildren<BrowserRouterProps>
> = BrowserRouter as ComponentType<PropsWithChildren<BrowserRouterProps>>;
