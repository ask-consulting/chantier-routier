import { describe, expect, it } from "vitest";
import { PlanNodeLevel, WorksiteKind } from "@chantia/shared";
import {
  buildPlanNodes,
  countPlanNodes,
  MAX_PLAN_NODES,
  OrganizationPlan,
  PlanNode,
} from "./organization-plan.entity";

const aPlan = (nodes: PlanNode[] = []): OrganizationPlan =>
  OrganizationPlan.create({
    organizationId: "org-1",
    sourceTemplateCode: null,
    name: " Villa maison ",
    kind: WorksiteKind.BUILDING,
    nodes,
  });

describe("buildPlanNodes", () => {
  it("takes each level from the depth, and trims the labels", () => {
    const [phase] = buildPlanNodes([
      {
        label: " Fondations ",
        children: [
          {
            label: "Semelles",
            children: [{ label: "Coulage", isControl: true }],
          },
        ],
      },
    ]);

    expect(phase.level).toBe(PlanNodeLevel.PHASE);
    expect(phase.label).toBe("Fondations");
    expect(phase.isControl).toBe(false);
    expect(phase.children[0].level).toBe(PlanNodeLevel.TASK);
    expect(phase.children[0].children[0].level).toBe(PlanNodeLevel.SUBTASK);
    expect(phase.children[0].children[0].isControl).toBe(true);
  });

  it("refuses a fourth level", () => {
    expect(() =>
      buildPlanNodes([
        {
          label: "a",
          children: [
            {
              label: "b",
              children: [{ label: "c", children: [{ label: "d" }] }],
            },
          ],
        },
      ]),
    ).toThrow(/three levels/);
  });
});

describe("OrganizationPlan", () => {
  it("trims its name and refuses an empty one", () => {
    expect(aPlan().name).toBe("Villa maison");
    expect(() =>
      OrganizationPlan.create({
        organizationId: "org-1",
        sourceTemplateCode: null,
        name: "  ",
        kind: WorksiteKind.OTHER,
        nodes: [],
      }),
    ).toThrow(/name/);
  });

  it("refuses more lines than a plan can hold", () => {
    const line: PlanNode = {
      id: "n",
      level: PlanNodeLevel.PHASE,
      label: "x",
      isControl: false,
      children: [],
    };
    expect(() =>
      aPlan(Array.from({ length: MAX_PLAN_NODES + 1 }, () => line)),
    ).toThrow(/more than/);
  });

  it("counts the lines of every level", () => {
    expect(
      countPlanNodes(
        buildPlanNodes([
          { label: "a", children: [{ label: "b" }, { label: "c" }] },
        ]),
      ),
    ).toBe(3);
  });

  it("keeps what a revision does not name, and its identity", () => {
    const plan = aPlan(buildPlanNodes([{ label: "a" }]));
    const revised = plan.revise({ name: "Autre" });

    expect(revised.id).toBe(plan.id);
    expect(revised.name).toBe("Autre");
    expect(revised.kind).toBe(WorksiteKind.BUILDING);
    expect(revised.nodes).toEqual(plan.nodes);
    expect(revised.createdAt).toEqual(plan.createdAt);
  });
});
