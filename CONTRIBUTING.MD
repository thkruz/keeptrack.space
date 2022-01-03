## Contributing

### Finding An Open Issue/Story

Issues are located here: https://github.com/thkruz/keeptrack.space/issues

Assign yourself to the issue by clicking on the issue and clicking on the assignee tab. This helps prevent duplication of work. **_If you are no longer working on the issue, please remove yourself as the assignee._**

### Creating a New Branch

You should always create a new branch for any new work. This allows you to easily track your work and allows you to easily merge your work back into the master branch. **_Commits directly to the master branch are not allowed._**

```bash
    git checkout -b <branch-name>   # create a new branch
```

### Creating a Merge Request

1. After you have created your initial changes. Commit them to your new branch

```bash
    git add .                       # Add all changes
    git commit -am "message"        # Commit changes with a message
    git push origin <branch-name>   # Push your branch to the repository
```

2. Go to: https://github.com/thkruz/keeptrack.space/pulls

### CI/CD Pipeline

Every time you open a new pull request or add a new commit to an open pull request, the CI/CD pipeline will automatically run. This will handle verifying that on a neutral enviornment all tests pass, the project builds, code coverage is good, and the pull request is ready to be merged.

## Best Practices

### Clean Code

Please use clean code. If you are not familiar, please refer to the following: https://gist.github.com/wojteklu/73c6914cc446146b8b533c0988cf8d29

### VS Code Extensions

You are only as good as your tools. Some recommended extensions to improve your workflow.

- Visual Studio IntelliCode: https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.vscodeintellicode

- Prettier - Code formatter: https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode

- ESLint: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint

- Conventional Commits: https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits
