import React from "react";
import { HashRouter, NavLink, Route, Redirect, Switch } from "react-router-dom";

import CodeHighlighting from "./code-highlighting";
import RichText from "./rich-text";

/**
 * Examples.
 *
 * @type {Array}
 */

const EXAMPLES = [
  ["Rich Text", RichText, "/rich-text"],
  ["Code Highlighting", CodeHighlighting, "/code-highlighting"]
];

/**
 * App.
 *
 * @type {Component}
 */

export default class App extends React.Component {
  state = {
    error: null,
    info: null
  };

  componentDidCatch(error, info) {
    this.setState({ error, info });
  }

  render() {
    return (
      <HashRouter>
        <div className="app">
          <div className="nav">
            <span className="nav-title">Ask Question</span>
          </div>
          <div className="tabs">
            {EXAMPLES.map(([name, Component, path]) => (
              <NavLink
                key={path}
                to={path}
                className="tab"
                activeClassName="active"
              >
                {name}
              </NavLink>
            ))}
          </div>
          {this.state.error ? this.renderError() : this.renderExample()}
        </div>
      </HashRouter>
    );
  }

  renderExample() {
    return (
      <div className="example">
        <Switch>
          {EXAMPLES.map(([name, Component, path]) => (
            <Route key={path} path={path} component={Component} />
          ))}
          <Redirect from="/" to="/rich-text" />
        </Switch>
      </div>
    );
  }

  renderError() {
    return (
      <div className="error">
        <p>An error was thrown by one of the example's React components!</p>
        <pre className="info">
          <code>
            {this.state.error.stack}
            {"\n"}
            {this.state.info.componentStack}
          </code>
        </pre>
      </div>
    );
  }
}
