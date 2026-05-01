import { Module } from "@medusajs/framework/utils"
import BuyerOrgModuleService from "./service"

export const BUYER_ORG_MODULE = "buyer_org"

export default Module(BUYER_ORG_MODULE, {
  service: BuyerOrgModuleService,
})
