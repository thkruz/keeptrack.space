## Contributing to KeepTrack

First off, thanks for taking the time to contribute! 🌍💫

### Understanding Issues, Labels, and Milestones

#### Issues:

- Located here: https://github.com/thkruz/keeptrack.space/issues
- Before starting work on an issue, please assign yourself to prevent duplication of effort. If you decide not to work on an issue, unassign yourself.

#### Labels:

We use a set of labels to help classify and categorize issues:

- **Type**: Feature, Bug, Enhancement, Optimization, Design, Question
- **Status**: In-Progress, Testing
- **First Timers**: Good First Issue
- **Triage**: Duplicate, Invalid, Wontfix
- **Miscellaneous**: Help Wanted

More information on these labels can be found in our [Label Guidelines](#Label-Guidelines).

#### Milestones:

- Milestones help us group issues and PRs for specific releases or time-bound objectives. For long-term goals, we use the "Near Future" and "Future Release" milestones. To track issues we're considering but haven't scheduled yet, we use the "Backlog" milestone.

More information on these milestones can be found in our [Milestone Guidelines](#Milestone-Guidelines).

### Creating a New Branch

Always branch from the develop branch for new features or fixes. This makes tracking and merging easier. Direct commits to the master and develop branch are prohibited.

```bash
    git checkout -b <branch-name>   # create a new branch
```

### Opening a Pull Request

1. Commit your changes to your branch:

```bash
    git add .                       # Stage all changes
    git commit -am "message"        # Commit changes with a descriptive message
    git push origin <branch-name>   # Push your branch to the repository
```

2. Create a PR at: https://github.com/thkruz/keeptrack.space/pulls

### CI/CD Pipeline

For each PR or new commit to an open PR, our CI/CD pipeline auto-runs, ensuring tests pass, the project builds, code coverage is sufficient, and the PR is merge-ready.

## Best Practices

### Clean Code

Please use clean code. If you are not familiar, please refer to the following: https://gist.github.com/wojteklu/73c6914cc446146b8b533c0988cf8d29

### VS Code Extensions

You are only as good as your tools. Some recommended extensions to improve your workflow.

- Visual Studio IntelliCode: https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.vscodeintellicode

- Prettier - Code formatter: https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode

- ESLint: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint

- Conventional Commits: https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits

## Label Guidelines

In this repository, labels help us categorize, prioritize, and assign tasks effectively. Here's how we utilize them:

### Type

- `Feature`: New features or requests.
- `Bug`: Code issues or errors.
- `Enhancement`: Improvements to existing features.
- `Optimization`: Code or performance optimizations.
- `Design`: Issues related to UI/UX.
- `Question`: For discussions or clarifications.

### Status

- `In-Progress`: Tasks currently being worked on.
- `Testing`: Tasks in the testing phase.

### First Timers

- `Good First Issue`: Ideal for newcomers to the project.

### Triage

- `Duplicate`: Issues that are repeated.
- `Invalid`: Issues that are not relevant or incorrect.
- `Wontfix`: Issues acknowledged but won't be addressed in the foreseeable future.

### Miscellaneous

- `Help Wanted`: Issues where assistance is required, possibly from the community.

When opening a new issue or pull request, ensure to apply the most appropriate label(s) to assist maintainers and other contributors in understanding your contribution's context and needs.

## Milestone Guidelines

Milestones are a key organizational tool used in this repository to group related issues and pull requests for a specific goal or time frame. Here's how we use them:

- **Specific Release**: Issues planned for a specific upcoming release (e.g., v2.5, v3.0).
- **Next Up**: Issues to address soon, but not in the next release.
- **Future Release**: Issues acknowledged but without a specific timeline.
- **Backlog**: Issues acknowledged but aren't on the active roadmap.

Always link your issue or pull request to a milestone. If unsure about which milestone to use, you can mention it in your issue or PR, and a maintainer will help categorize it.
