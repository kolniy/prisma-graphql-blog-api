const fs = require('fs')
const path = require('path')
const { ApolloServer, gql, PubSub } = require('apollo-server');
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()
const pubsub = new PubSub()

// async function main() {
        // await prisma.user.create({
        //   data: {
        //     name: 'Alice',
        //     email: 'alice@prisma.io',
        //     posts: {
        //       create: { title: 'Hello World' },
        //     },
        //     profile: {
        //       create: { bio: 'I like turtles' },
        //     },
        //   },
        // })
      
        // const allUsers = await prisma.user.findMany({
        //   include: {
        //     posts: true,
        //     profile: true,
        //   },
        // })
        // console.dir(allUsers, { depth: null })
//         const post = await prisma.post.update({
//             where: { id: 1 },
//             data: { published: true },
//           })
//           console.log(post)
          
// }

// main()
//     .catch((e) => {
//         throw e
//     })
//     .finally(async () => {
//         await prisma.$disconnect()
//     })

const resolvers = {
    Query: {
       helloWorld(parent, args, context, info){
           return "Hello "+ args.name
       },
       async users(){
            const allUsers = await prisma.user.findMany()
            return allUsers
       },
       async posts(parent, args, context, info){
           const validUser = await prisma.user.findUnique({
                where:{
                    id: args.author
                }
           })
           if(!validUser){
               throw new Error("User not found")
           }

           const posts = await prisma.post.findMany({
               where: {
                   authorId: args.author
               }
           })
           return posts
       },
       async comments(parent, { post }, context, info){
            const validPost  = await prisma.post.findFirst({
                where: {
                    id: post
                }
            })
            if(!validPost){
                throw new Error("post not found")
            }
            const comments = await prisma.comment.findMany({
                where: {
                    postid: post
                }
            })
            return comments
       }
    },
    Mutation: {
        async createUser(parent, args, context, info){
           let userExists = await prisma.user.findUnique({
               where: {
                   email: args.data.email
               }
           })
           if(userExists){
             throw new Error("User alredy exists")
           }
           const user = await prisma.user.create({
               data: {
                   email: args.data.email,
                   name: args.data.name,
                   age: args.data.age
               }
           })
           return user
       },
       async createPost(parent, args, context, info){
           let validUser = await prisma.user.findUnique({
               where: {
                   id: args.data.author
               }
           })
           if(!validUser){
               throw new Error("User not found")
           }
           const newPost = await prisma.post.create({
               data: {
                 title: args.data.title,
                 body: args.data.body,
                 published: args.data.published,
                 author: {
                     connect: {
                         id: args.data.author
                     }
                 }
               }
           })
           return newPost
       },
       async createComment(parent, { data }, context, info){
            const validUser = await prisma.user.findUnique({
                where: {
                    id: data.commenter
                }
            })
            
            if(!validUser){
                throw new Error("User not found")
            }

            const validPost = await prisma.post.findFirst({
                where: {
                    id: data.post,
                    published: true
                }
            })

            if(!validPost){
                throw new Error("post not found")
            }

            const comment = await prisma.comment.create({
                data: {
                    comment: data.comment,
                    commenter: {
                        connect: {
                            id: data.commenter
                        }
                    },
                    post: {
                        connect: {
                            id: data.post
                        }
                    }
                }
            })

            return comment
       },
    async updateUser(parent, { id, data }, context, info){
        const validUser = await prisma.user.findUnique({
            where: {
                id
            }
        })
        if(!validUser){
            throw new Error("user not found")
        }
        const updates = {}
        if(data.name){
            updates['name'] = data.name
        }
        if(data.age){
            updates['age'] = data.age
        }
        const updatedUser = await prisma.user.update({
            where: {
                id
            },
            data: updates
        })
        return updatedUser
    },
    async updatePost(parent, { id, data }, context, info){
        const validPost = await prisma.post.findUnique({
            where: {
                id
            }
        })
        if(!validPost){
            throw new Error("post not found")
        }
        const postUpdates = {}
        if(data.title){
            postUpdates['title'] = data.title
        }
        if(data.body){
            postUpdates['body'] = data.body
        }
        if(data.published){
            postUpdates['published'] = data.published
        }
        const updatedPost = await prisma.post.update({
            where: {
                id
            },
            data: postUpdates
        })
        return updatedPost
    },
    async updateComment(parent, { id, data }, context, info){
        const validComment = await prisma.comment.findUnique({
            where: {
                id
            }
        })
        if(!validComment){
            throw new Error("comment not found")
        }
        const commentUpdates = {}
        if(typeof data.comment === 'string'){
            commentUpdates['comment'] = data.comment
        }
        const updatedComment = await prisma.comment.update({
            where: {
                id
            },
            data: commentUpdates
        })
        return updatedComment
    },
    async deleteUser(parent, { id }, context, info){
        const deletePosts = prisma.post.deleteMany({
            where: {
                authorId: id
            }
        })

        const deleteComments = prisma.comment.deleteMany({
            where: {
                commenterid: id
            }
        })

        const deleteUser = prisma.user.delete({
            where: {
                id
            }
        })
        const user = await prisma.user.findUnique({
            where: {
                id
            }
        })
        const transaction = await prisma.$transaction([deleteComments, deletePosts, deleteUser])
        return user
    }, 
    async deletePost(parent, { id }, context, info){
        const validPost = await prisma.post.findUnique({
            where: {
                id
            }
        })
        if(!validPost){
            throw new Error("post not found")
        }
        const deleteComments = prisma.comment.deleteMany({
            where: {
                postid: id  
            }
        })
        const deletePost = prisma.post.delete({
            where: {
                id
            }
        })
        const transaction = await prisma.$transaction([deleteComments, deletePost])
        return validPost
    },
    async deleteComment(parent, { id }, context, info){
        const validComment = await prisma.comment.findUnique({
            where: {
                id
            }
        })
        if(!validComment){
            throw new Error("comment not found")
        }
        await prisma.comment.delete({
            where: {
                id
            }
        })
        return validComment
    }
    },
    Subscription: {
        comment: {
            subscribe(parent, args, context, info){

            }
        },
        post: {
            subscribe(parent, args, context, info){
                
            }
        }
    },
    User: {
      async posts(parent, args, context, info){
        const posts = await prisma.post.findMany({
            where: {
                authorId: parent.id
            }
        })
        return posts
      },
      async comments(parent, args, context, info){
          const comments = await prisma.comment.findMany({
              where: {
                  commenterid: parent.id
              }
          })
          return comments
      }
    },
    Post: {
        async author(parent, args, context, info){
            const author = await prisma.post.findUnique({
               where: {
                   id: parent.id
               } 
            }).author()
            return author
        },
        async comments(parent, args, context, info){
            const comments = await prisma.comment.findMany({
                where: {
                    postid: parent.id
                }
            })
            return comments
        }
    },
    Comment: {
        async commenter(parent, args, context, info){
            const commenter = await prisma.comment.findUnique({
                where: {
                    id: parent.id
                }
            }).commenter()
            return commenter
        },
        async post(parent, args, context, info){
            const post = await prisma.comment.findUnique({
                where: {
                    id: parent.id
                }
            }).post()
            return post
        }
    }
}

const server = new ApolloServer({
    subscriptions: {
        path: '/subscription'
    },
    typeDefs: fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf-8'),
    resolvers
})

server.listen().then(({ url }) => {
    console.log(`Server is running on port ${url}`)
})
