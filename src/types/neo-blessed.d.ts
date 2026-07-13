// neo-blessed ships no type declarations of its own, but it is a
// drop-in-compatible fork of `blessed`'s public API (same widget
// constructors, same `Widgets` namespace shape used throughout
// src/tui/*.ts, e.g. `blessed.Widgets.Screen`, `blessed.Widgets.ListElement`,
// `blessed.Widgets.Events.IKeyEventArg`). Re-export @types/blessed's
// definitions under the 'neo-blessed' module specifier instead of hand
// rolling a parallel set of types.
declare module 'neo-blessed' {
  import * as Blessed from 'blessed';
  export = Blessed;
}
