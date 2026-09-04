Tests whether the solver recognizes a telescoping structure disguised by a
product in the denominator. Technique: decompose 1/(k(k+1)) into partial
fractions 1/k - 1/(k+1), then collapse the sum term by term. Instantiates
the principle that a closed form often comes from rewriting a term as a
difference of consecutive values. Common failure: attempting induction on
the stated closed form without ever deriving it, which proves the identity
but teaches nothing about where it comes from.
