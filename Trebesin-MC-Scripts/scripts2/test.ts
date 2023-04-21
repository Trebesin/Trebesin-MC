function testMain (n): number {
    return n * 2;
}

interface test {
     user: string
}

function sendUser(user:test) {
    return user.user
}

sendUser({k:1});