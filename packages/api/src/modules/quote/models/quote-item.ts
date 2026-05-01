import { model } from "@medusajs/framework/utils"
import Quote from "./quote"

const QuoteItem = model.define("quote_item", {
  id: model.id({ prefix: "qti" }).primaryKey(),
  // Optional reference to a Medusa product/variant; for free-form RFQs
  // the buyer can also describe what they need by title only.
  product_id: model.text().nullable(),
  variant_id: model.text().nullable(),
  title: model.text(),
  description: model.text().nullable(),
  quantity: model.number(),
  // Buyer's target / desired price per unit (optional)
  target_unit_price: model.bigNumber().nullable(),
  // Filled by seller in their response
  unit_price: model.bigNumber().nullable(),
  lead_time_days: model.number().nullable(),
  notes: model.text().nullable(),
  quote: model.belongsTo(() => Quote, { mappedBy: "items" }),
})

export default QuoteItem
