import * as plugins from "@app/js/plugins/plugins"
// @ponicode
describe("plugins.loadExtraPlugins", () => {
    test("0", async () => {
        await plugins.loadExtraPlugins("^5.0.0")
    })

    test("1", async () => {
        await plugins.loadExtraPlugins("4.0.0-beta1\t")
    })

    test("2", async () => {
        await plugins.loadExtraPlugins("v1.2.4")
    })

    test("3", async () => {
        await plugins.loadExtraPlugins("1.0.0")
    })

    test("4", async () => {
        await plugins.loadExtraPlugins(true)
    })

    test("5", async () => {
        await plugins.loadExtraPlugins("")
    })
})
