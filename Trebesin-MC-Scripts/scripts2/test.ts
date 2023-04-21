function testMain (n:number): number {
    return n * 2;
}

interface test {
     user: string
}

function sendUser(user:test) {
    return user.user
}

sendUser({user:''});