import { describe,expect,it } from "vitest";
import type { DB1 } from "../types/db1";
import type { Quote } from "../types/db2";
import { calculateQuote } from "./quoteCalculator";

const config:DB1={
  versionId:1,
  updatedAt:new Date().toISOString(),
  branding:[{type:"Fixed",cost:10}],
  labor:[{type:"Fixed",cost:20}],
  sheets:[{
    sheetName:"Section",type:"material",order:1,materials:[{
      materialId:"section_material",materialName:"Material",
      questions:{Q1:{key:"Q1",name:"Length",label:"Length",type:"number",required:true}},
      properties:{},
      results:{R_Cost:{type:"formula",formula:"Length",dependencies:["LENGTH"]}}
    }]
  }]
};

function quote():Quote{return{
  id:"00000000-0000-0000-0000-000000000001",displayName:"Test",versionId:1,
  createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:"draft",
  sections:{Section:{
    materials:[{materialId:"section_material",material:"Material",questions:{Q1:{name:"Length",value:100}},properties:{},results:{}}],
    branding:{type:"Fixed",cost:10},labor:{type:"Fixed",cost:20}
  }},
  finalResult:{R_Cost:0}
};}

describe("calculateQuote",()=>{
  it("includes branding and labor once per section in the final total",()=>{
    const result=calculateQuote(quote(),config).quote;
    expect(result.finalResult.R_Cost).toBe(130);
  });
});
