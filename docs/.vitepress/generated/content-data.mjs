export const posts = [
  {
    "title": "Obsidian Link Example",
    "route": "/posts/knowledge/ai/obsidian-links",
    "tags": [
      "notes",
      "wiki"
    ],
    "categories": [
      "knowledge",
      "ai"
    ]
  },
  {
    "title": "Project Summary",
    "route": "/posts/dev/project-summary",
    "tags": [],
    "categories": [
      "dev"
    ]
  },
  {
    "title": "Welcome",
    "route": "/posts/welcome",
    "tags": [],
    "categories": [
      "Unclassified"
    ]
  }
]

export const sidebar = [
  {
    "text": "Post Categories",
    "collapsed": false,
    "items": [
      {
        "text": "dev",
        "collapsed": true,
        "items": [
          {
            "text": "Project Summary",
            "link": "/posts/dev/project-summary"
          }
        ]
      },
      {
        "text": "knowledge",
        "collapsed": true,
        "items": [
          {
            "text": "ai",
            "collapsed": true,
            "items": [
              {
                "text": "Obsidian Link Example",
                "link": "/posts/knowledge/ai/obsidian-links"
              }
            ]
          }
        ]
      },
      {
        "text": "Unclassified",
        "collapsed": true,
        "items": [
          {
            "text": "Welcome",
            "link": "/posts/welcome"
          }
        ]
      }
    ]
  }
]

export const tags = [
  "notes",
  "wiki"
]
