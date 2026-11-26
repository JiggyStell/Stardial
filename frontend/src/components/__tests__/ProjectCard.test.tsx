/* @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { ProjectCard } from "../ProjectCard";
import type { SplitProject } from "@/lib/stellar";

const baseProject = (overrides: Partial<SplitProject> = {}): SplitProject => ({
  projectId: "P123",
  title: "Test Project",
  projectType: "App",
  token: "",
  owner: "GABC",
  collaborators: [{ address: "G1", alias: "Alice", basisPoints: 100 }],
  locked: false,
  totalDistributed: "0",
  distributionRound: 1,
  balance: "1500",
  ...overrides,
});

describe("ProjectCard", () => {
  it("renders unlocked project without Locked badge", () => {
    render(<ProjectCard project={baseProject()} />);

    expect(screen.getByText(/Test Project/)).toBeTruthy();
    expect(screen.queryByText(/Locked/)).toBeNull();
    expect(screen.getByText(/Available|Earnings/)).toBeTruthy();
  });

  it("renders locked project with Locked badge", () => {
    render(<ProjectCard project={baseProject({ locked: true })} />);

    expect(screen.getByText(/Locked/)).toBeTruthy();
    expect(screen.getByText(/Test Project/)).toBeTruthy();
  });
});

describe("ProjectCard paused distribution badge", () => {
  it("renders no Paused badge for the default, unpaused project", () => {
    render(<ProjectCard project={baseProject()} />);

    expect(screen.queryByTestId("project-card-paused-badge")).toBeNull();
    expect(screen.queryByText("Paused")).toBeNull();
  });

  it("renders a Paused badge when distributions are paused", () => {
    render(<ProjectCard project={baseProject()} distributionPaused />);

    expect(screen.getByTestId("project-card-paused-badge")).toHaveTextContent(
      "Paused",
    );
  });

  it("shows Locked and Paused together, since a locked project can still be paused", () => {
    render(
      <ProjectCard project={baseProject({ locked: true })} distributionPaused />,
    );

    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(screen.getByTestId("project-card-paused-badge")).toHaveTextContent(
      "Paused",
    );
  });

  it("disables Trigger Distribution and exposes the reason to assistive tech when paused", () => {
    const onDistribute = vi.fn();
    render(
      <ProjectCard
        project={baseProject()}
        onDistribute={onDistribute}
        distributionPaused
      />,
    );

    const button = screen.getByRole("button", { name: /trigger distribution/i });
    expect(button).toBeDisabled();
    // Not just visually disabled: the reason is programmatically associated.
    expect(button).toHaveAccessibleDescription(
      /paused by the contract admin/i,
    );

    fireEvent.click(button);
    expect(onDistribute).not.toHaveBeenCalled();
  });

  it("keeps Trigger Distribution enabled for a funded, unpaused project", () => {
    render(<ProjectCard project={baseProject()} onDistribute={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /trigger distribution/i }),
    ).toBeEnabled();
    expect(
      screen.queryByText(/paused by the contract admin/i),
    ).toBeNull();
  });

  it("still renders the Paused badge in the compact earnings variant", () => {
    render(<ProjectCard project={baseProject()} userEarnings="25" distributionPaused />);

    expect(screen.getByTestId("project-card-paused-badge")).toHaveTextContent(
      "Paused",
    );
  });
});


describe("ProjectCard interaction", () => {
  it.each([undefined, "25"])("supports keyboard selection with earnings %s", async (userEarnings) => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <ProjectCard project={baseProject()} userEarnings={userEarnings} onSelect={onSelect} isSelected={false} />,
    );
    const card = screen.getByRole("button", { name: /Test Project/ });
    expect(card).toHaveClass("interactive-card");
    expect(card).toHaveAttribute("aria-pressed", "false");
    await user.tab();
    expect(card).toHaveFocus();
    await user.keyboard("{Enter>}");
    expect(card).toHaveAttribute("data-pressed", "true");
    await user.keyboard("{/Enter}");
    expect(card).not.toHaveAttribute("data-pressed");
    await user.keyboard("[Space>]");
    expect(card).toHaveAttribute("data-pressed", "true");
    await user.keyboard("[/Space]");
    expect(card).not.toHaveAttribute("data-pressed");
    expect(onSelect).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(card, { key: " " });
    expect(card).toHaveAttribute("data-pressed", "true");
    fireEvent.blur(card);
    expect(card).not.toHaveAttribute("data-pressed");
    rerender(
      <ProjectCard project={baseProject()} userEarnings={userEarnings} onSelect={onSelect} isSelected />,
    );
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it.each([undefined, "25"])("keeps read-only cards out of the tab order with earnings %s", async (userEarnings) => {
    const { container } = render(<ProjectCard project={baseProject()} userEarnings={userEarnings} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector(".interactive-card")).toBeNull();
    await userEvent.setup().tab();
    expect(document.body).toHaveFocus();
  });
});
