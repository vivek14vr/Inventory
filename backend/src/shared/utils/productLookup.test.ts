import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestError } from "../errors/AppError.js";
import {
  findProductByBrandAndLabel,
  indexProductsByBrandAndLabel,
} from "./productLookup.js";

type Product = {
  name: string;
  secondaryName?: string;
  brand: string;
};

test("finds products by primary or secondary label within a brand", () => {
  const products: Product[] = [
    { name: "Paper Bowl", secondaryName: "PB 500", brand: "EcoServe" },
    { name: "Paper Cup", brand: "EcoServe" },
  ];

  assert.equal(
    findProductByBrandAndLabel(products, "ecoserve", "pb 500", (p) => p.brand),
    products[0]
  );
  assert.equal(
    findProductByBrandAndLabel(products, "EcoServe", "paper cup", (p) => p.brand),
    products[1]
  );
});

test("rejects ambiguous primary and secondary product labels", () => {
  const products: Product[] = [
    { name: "Paper Bowl", secondaryName: "Lunch Box", brand: "EcoServe" },
    { name: "Lunch Box", brand: "EcoServe" },
  ];

  assert.throws(
    () => indexProductsByBrandAndLabel(products, (p) => p.brand),
    BadRequestError
  );
});
