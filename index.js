const GALAXY_VERSION = 'v1.0.1-beta'
module.exports.Galaxy = function Galaxy(pathname) {
    return new Object({
        path: pathname,
        type: 'Galaxy',
        str: `^/${pathname}`,
        regex: new RegExp(`^/${pathname}`),
        parent: resolveParent,
        depth: [],
        append: append,
        resolve: resolver
    })
}
module.exports.Star = function Star(pathname) {
    return new Object({
        path: pathname,
        type: 'Star',
        str: pathname,
        regex: new RegExp(`/${pathname}`),
        parent: resolveParent,
        depth: [],
        append: append,
        resolve: resolver,
    })
}
module.exports.Moon = function Moon(pathname, handler, httpMethod) {
    return new Object({
        type: 'Moon',
        path: pathname,
        str: pathname,
        httpMethod: httpMethod,
        regex: new RegExp(`/${pathname}`),
        parent: resolveParent,
        handler: handler
    })
}

function resolveParent() {
    return this.path
}

function append(...stars) {
    stars.forEach(obj => {
        compiled = obj.path.split('/')
        for (i in compiled) {
            if (compiled[i][0] == '$') {
                if (i == compiled.length - 1) {
                    compiled[i] = '(?!.+/).+'
                } else {
                    compiled[i] = '(.+)'
                }
            }
        }
        compiled = compiled.join('/')
        obj.str = this.str + '/' + compiled
        obj.path = this.path + '/' + obj.path
        if (obj.type === 'Star') {
            obj.depth.forEach(child => {
                child.path = this.path + '/' + child.path
            })
        } else if (obj.type === 'Moon') {
            obj.str += '$'
        }
        obj.regex = new RegExp(obj.str)
        this.depth.push(obj)
    })

}
const responses = {
    '404': {
        statusCode: 404,
        headers: {},
        body: "Path Not Found (Galaxy " + GALAXY_VERSION + ")"
    },
    '500': {
        statusCode: 500,
        headers: {},
        body: "Internal Server Error (Galaxy " + GALAXY_VERSION + ")"
    }
}
const buildErr = (code) => {
    let res = responses[code]
    return new Promise((resolve) => {
        resolve(res)
    })
}

function resolver(event) {
    try {
        if (event.path.match(this.regex)) {
            if (this.depth.length > 0) {
                for (i in this.depth) {
                    let local = this.depth[i]
                    if (event.path.match(local.regex)) {
                        if (local.type != 'Moon') {
                            return local.resolve(event)
                        } else {
                            if (local.handler) {
                                if (local.httpMethod === event.httpMethod) {
                                    let params = {}
                                    let ids = local.path.split('/')
                                    let rec = event.path.split('/')
                                    rec.shift()
                                    for (i in ids) {
                                        if (ids[i][0] == '$') {
                                            params[ids[i].substr(1, ids[i].length)] = rec[i].split('?')[0]
                                        }
                                    }
                                    event['params'] = params
                                    return local.handler(event)
                                }
                            }
                        }
                    }
                }
                return buildErr('404')
            } else {
                return buildErr('404')
            }
        } else {
            return buildErr('404')
        }
    } catch (err) {
        return buildErr('500')
    }
}