import { render } from '@ufo-soft/caelus'

console.log(render('saved'))
console.log(render({ count: 3 }))
console.log(JSON.stringify(render(null)))
