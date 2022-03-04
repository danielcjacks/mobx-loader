# mobx-loader
Reactively check if an async function is running


- tracks by fn itself, so functions are separate even if e.g. they have the same name or same body and in same laoderState
- first time a function loader is set, all reactions will trigger even if they are not looking at those specific args.
    In react this will cause a single rerender, but the correct isLoading will still be shown. After this it only reacts if
    needed