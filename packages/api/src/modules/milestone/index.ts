import { Module } from "@medusajs/framework/utils"
import MilestoneModuleService from "./service"

export const MILESTONE_MODULE = "milestone"

export default Module(MILESTONE_MODULE, {
  service: MilestoneModuleService,
})
