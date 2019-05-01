# svuelte
This small script is intended to make transitioning from [Vue](https://vuejs.org/) to [Svelte](https://svelte.dev/) easier. Those frameworks are used in a similar fashion, but conceptually use quite different approaches (Vue is a more traditional one, a library, and Svelte is a "dissapearing framework").

Because of those similarities, it's possible to automate some of the changes. It doesn't mean that this tool will do **everything** for you — but it'll try. Some features of Vue are missing from Svelte; if you use them, you'll need to rewrite some parts of your components manually. In most cases, `svuelte` will point you to such parts.

For now, this tool only works on SFC (Single File Components) individually, converting `.vue` files to `.svelte`.

## Installation and usage

```
npm install -g svuelte
```

This will make `svuelte` available globally. Now you can run it:

```
svuelte /path/to/some/vue/Component.vue /path/to/converted/svelte/Component.svelte
```

You can omit output path, in that case `.svelte` file will be produced in the current directory.

## What svuelte will do

### Convert script tag

Svuelte expects that your Vue component contains JS code with a single `export default` statement, containing a component declaration as a static object:
```html
<script>
export default {
  name: 'AButton',
  ...
}
</script>
```

It will look into this object and convert following fields:
* **props** will be converted to `export let prop = defaultValue; // type`
* **data** will be converted to `let field = initialValue;`
* **computed** will be converted to `$: computedField = (() => { ... })();`. In case the compute function contains only a single `return` statement, it will become simply `$: computedField = expressionAfterReturn;`
* **beforeCreated** and **created** will be inlined after all variable declarations, at the top of generated `script` tag
* **mounted**, **beforeUpdate**, **updated**, **destroyed** hooks will be converted to appropriate Svelte equivalents (**onMount**, **beforeUpdate**, **afterUpdate**, **onDestroy**)
* **methods** will be converted to function declarations at the bottom of the generated `script` tag

Svuelte will try and remove `this.` from places where it would be bound to the component instance (it's not needed in Svelte, as all component fields available as local variables).

It will look into arrow functions (`() => this.x * 2` will become `() => x * 2`), but won't touch simple function declarations (`function foo() { return this.x; }` will be left unchanged).

However, if you instantly bind a function to `this`, this binding will be removed as well as all references to `this` from within that function:
```javascript
let bar = function() {
  console.log(this.x);
}.bind(this);
```

Will become:
```javascript
let bar = function() {
  console.log(x);
}
```

### Convert css sections

Any `style` block with a `scoped` attribute will be left unchanged (in Svelte all styles are scoped by default).

Within unscoped stylesheets, each rule will be wrapped in a `:global(...)` pseudo-selector.

### Convert template

Svuelte will unwrap the `<template>` tag and put it contents and the bottom of the generated Svelte component.

It will perform following transformations:
* Attributes starting with `v-bind:` and `:` will be converted to `attr="{boundValue}"` syntax
* Attributes starting with `v-on:` and `@` will be converted to `on:event="{boundFunction}"` syntax
* `v-if`, `v-else-if`, `v-else` and `v-for` directives will be converted to corresponding Svelte blocks (`{#if ...}`, `{:else if ...}`, `{:else}`, `{#each ...}`)
* `v-html` directive will be converted to `{@html field}` (if element contained any children, they will be discarded)
* Double-bracket `{{ interpolations }}` will be transformed to `{single-bracket}`

## What svuelte won't do

As you can see already, Svuelte does not cover all features of Vue. In particular,
* For now, Svuelte will **silently** ignore all references to special fields and methods available on Vue component instances (they start with a "$", like `$set`, `$slots` and so on)
* Directives `v-text`, `v-show`, `v-slot`, `v-pre`, `v-cloak`, `v-once` are **silently** ignored too (for now). Same applies for "special attributes" `key`, `ref` and `is`
* Vue built-in helper components (like `<component>`, `<keep-alive>`, `<transition>`) are not converted and left as-is
* Except for those mentioned above, none of the component options are supported (including `render`, `watch`, `updated`, `activated`, `deactivated` and so on). Svuelte will report each field it was unable to convert.

Also Svuelte won't perform any improvements/optimisations on your code (except for the trivial ones, like removing `this`). Some parts are probably will be possible to rewrite in a more elegant way (computed fields, for example).

Once again, after you run `svuelte`, you'll probably get not working code. But it will hopefully help you to get started.


