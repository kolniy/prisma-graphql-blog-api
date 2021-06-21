const fs = require('fs')
const path = require('path')
const { ApolloServer, gql } = require('apollo-server');
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

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
       }
    },
    User: {
      async posts(parent, args, context, info){
        const posts = await prisma.user.findUnique({
            where: {
                id: parent.id
            }
        }).posts()
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
    typeDefs: fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf-8'),
    resolvers
})

server.listen().then(({ url }) => {
    console.log(`Server is running on port ${url}`)
})
