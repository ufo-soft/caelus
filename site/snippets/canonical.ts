import { canonical } from '@ufo-soft/caelus/keybindings'

console.log(canonical('Shift+Cmd+K'))
console.log(canonical('control+option+esc'))
console.log(canonical('meta + up'))
console.log(JSON.stringify(canonical('shift')))
