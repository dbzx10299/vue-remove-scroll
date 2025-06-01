# Vue Remove Scroll

## Install

```bash
npm i vue-remove-scroll
```

## Usage

### Disable scroll

```js
import { useRemoveScroll } from 'vue-remove-scroll'

const { enableScroll, disableScroll } = useRemoveScroll()
```

### Allow scrolling on a certain element

```js
import { useRemoveScroll } from 'vue-remove-scroll'
import { ref } from 'vue'

const modal = ref(null)

const { enableScroll, disableScroll } = useRemoveScroll({
  excludedElements: [modal.value]
})
```

## Credits

This project is based on and contains code from:

- [react-remove-scroll](https://github.com/theKashey/react-remove-scroll)

## Licenses

This project is licensed under the [MIT License](https://github.com/rolldown/tsdown/blob/main/LICENSE).